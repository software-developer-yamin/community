import { db } from "@community/db";
import {
  callRoom,
  crashEvent,
  paymentTransaction,
  refundRequest,
  subscription,
  supportTicket,
  userProfile,
} from "@community/db/schema/rebuild";
import { ORPCError } from "@orpc/server";
import { and, count, desc, eq, gte, inArray, or } from "drizzle-orm";
import { log } from "evlog";
import { z } from "zod";

import { adminProcedure, protectedProcedure } from "../index";
import { completedChargeForSubscription } from "../lib/refund-charge-filter";
import {
  AUTO_DENY_DAYS_SINCE_CHARGE,
  canAppealRefund,
  canReviewRefund,
  classifyRefundRequest,
  daysBetween,
  HUMAN_REVIEW_SLA_DAYS,
  hoursBetween,
  isOpenRefundStatus,
  type RefundClassifierInput,
  type RefundStatus,
} from "../lib/refund-classifier";
import {
  checkSettlementTarget,
  classifyProviderOutcome,
  decideRefundAttempt,
  describeSettlementBlocker,
  humanReviewSlaDeadline,
  isRefundSettleable,
  needsSlaReset,
  PROVIDER_CALL_FAILED,
  recordedProviderStatus,
  resolveSettlementStatus,
} from "../lib/refund-executor";
import { sendRefundToProvider } from "../lib/refund-provider";
import { partitionPollerCandidates } from "../lib/refund-settlement-poller";

const REFUND_QUALIFYING_CRASHES = [
  "force_close",
  "anr",
  "black_screen",
] as const;

const OPEN_TICKET_STATUSES = ["open", "pending"] as const;

const PATH_STATUS = {
  auto_approve: "auto_approved",
  auto_deny: "auto_denied",
  human_review: "human_review",
} as const;

async function latestCompletedCharge(userId: string, subscriptionId: string) {
  const [charge] = await db
    .select({
      id: paymentTransaction.id,
      amount: paymentTransaction.amount,
      completedAt: paymentTransaction.completedAt,
      createdAt: paymentTransaction.createdAt,
    })
    .from(paymentTransaction)
    .where(completedChargeForSubscription(userId, subscriptionId))
    .orderBy(desc(paymentTransaction.createdAt))
    .limit(1);

  return charge ?? null;
}

async function completedSessionCount(userId: string): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(callRoom)
    .where(
      and(
        eq(callRoom.status, "ended"),
        or(eq(callRoom.participantA, userId), eq(callRoom.participantB, userId))
      )
    );

  return row?.value ?? 0;
}

async function crashCountSince(userId: string, since: Date): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(crashEvent)
    .where(
      and(
        eq(crashEvent.userId, userId),
        inArray(crashEvent.type, [...REFUND_QUALIFYING_CRASHES]),
        gte(crashEvent.createdAt, since)
      )
    );

  return row?.value ?? 0;
}

async function hasOpenLoginFailureTicket(userId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: supportTicket.id })
    .from(supportTicket)
    .where(
      and(
        eq(supportTicket.userId, userId),
        inArray(supportTicket.status, [...OPEN_TICKET_STATUSES]),
        inArray(supportTicket.category, ["technical", "other"])
      )
    )
    .limit(1);

  return Boolean(row);
}

async function buildClassifierInput(
  userId: string,
  chargeDate: Date,
  now: Date
): Promise<RefundClassifierInput> {
  const [profile] = await db
    .select({ lastLoginAt: userProfile.lastLoginAt })
    .from(userProfile)
    .where(eq(userProfile.userId, userId))
    .limit(1);

  const sessions = await completedSessionCount(userId);
  const daysSinceCharge = daysBetween(chargeDate, now);

  return {
    crashCount: await crashCountSince(userId, chargeDate),
    daysSinceCharge,
    everCompletedSession: sessions > 0,
    hasOpenLoginFailureTicket: await hasOpenLoginFailureTicket(userId),
    hoursSinceLastSuccessfulLogin: profile?.lastLoginAt
      ? hoursBetween(profile.lastLoginAt, now)
      : null,
    completedSessionCount: sessions,
  };
}

const requestRefund = protectedProcedure
  .input(z.object({ reason: z.string().min(1).max(1000).optional() }))
  .handler(async ({ context, input }) => {
    const userId = context.session.user.id;
    const now = new Date();

    const [sub] = await db
      .select()
      .from(subscription)
      .where(
        and(
          eq(subscription.userId, userId),
          inArray(subscription.status, ["active", "cancelled"])
        )
      )
      .orderBy(desc(subscription.createdAt))
      .limit(1);

    if (!sub) {
      throw new ORPCError("BAD_REQUEST", {
        message: "No refundable subscription found",
      });
    }

    const charge = await latestCompletedCharge(userId, sub.id);
    if (!charge) {
      throw new ORPCError("BAD_REQUEST", {
        message: "No completed payment found for this subscription",
      });
    }

    // Without this, a retried or repeated request inserts a second row. Once
    // 5-3f's executor lands it drains every auto_approved row for a charge,
    // so two rows here become two real refunds for one purchase.
    const priorRequests = await db
      .select({ id: refundRequest.id, status: refundRequest.status })
      .from(refundRequest)
      .where(eq(refundRequest.subscriptionId, sub.id));

    const inFlight = priorRequests.find((prior) =>
      isOpenRefundStatus(prior.status)
    );

    if (inFlight) {
      throw new ORPCError("CONFLICT", {
        message:
          "A refund request for this subscription is already in progress",
      });
    }

    const chargeDate = charge.completedAt ?? charge.createdAt;
    const classifierInput = await buildClassifierInput(userId, chargeDate, now);
    const decision = classifyRefundRequest(classifierInput, now);
    const status = PATH_STATUS[decision.path];

    // slaDeadline is NOT NULL but only meaningful on the human-review path.
    const slaDeadline =
      decision.slaDeadline ??
      new Date(now.getTime() + AUTO_DENY_DAYS_SINCE_CHARGE * 86_400_000);

    const [row] = await db
      .insert(refundRequest)
      .values({
        userId,
        subscriptionId: sub.id,
        paymentTransactionId: charge.id,
        refundAmount: charge.amount,
        path: decision.path,
        status,
        triggerCrashes: classifierInput.crashCount,
        triggerLoginFailure: classifierInput.hoursSinceLastSuccessfulLogin,
        triggerNeverConnected: classifierInput.everCompletedSession ? 0 : 1,
        triggerCompletedSessions: classifierInput.completedSessionCount,
        triggerDaysSinceCharge: classifierInput.daysSinceCharge,
        denialReason:
          decision.path === "auto_deny" ? decision.reason : input.reason,
        approvalReason:
          decision.path === "auto_approve" ? decision.reason : null,
        slaDeadline,
      })
      .returning();

    if (!row) {
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Could not record the refund request",
      });
    }

    return {
      id: row.id,
      path: decision.path,
      reason: decision.reason,
      status: row.status,
      slaDeadline: row.slaDeadline,
    };
  });

const getRefundStatus = protectedProcedure
  .input(z.object({ refundId: z.string().min(1) }))
  .handler(async ({ context, input }) => {
    const [row] = await db
      .select({
        id: refundRequest.id,
        status: refundRequest.status,
        denialReason: refundRequest.denialReason,
        approvalReason: refundRequest.approvalReason,
        refundAmount: refundRequest.refundAmount,
        slaDeadline: refundRequest.slaDeadline,
        providerRefundStatus: refundRequest.providerRefundStatus,
        createdAt: refundRequest.createdAt,
        resolvedAt: refundRequest.resolvedAt,
        currency: paymentTransaction.currency,
      })
      .from(refundRequest)
      .leftJoin(
        paymentTransaction,
        eq(refundRequest.paymentTransactionId, paymentTransaction.id)
      )
      .where(
        and(
          eq(refundRequest.id, input.refundId),
          eq(refundRequest.userId, context.session.user.id)
        )
      )
      .limit(1);

    if (!row) {
      throw new ORPCError("NOT_FOUND", { message: "Refund request not found" });
    }

    return row;
  });

const appealRefund = protectedProcedure
  .input(z.object({ refundId: z.string().min(1) }))
  .handler(async ({ context, input }) => {
    const [row] = await db
      .select()
      .from(refundRequest)
      .where(
        and(
          eq(refundRequest.id, input.refundId),
          eq(refundRequest.userId, context.session.user.id)
        )
      )
      .limit(1);

    if (!row) {
      throw new ORPCError("NOT_FOUND", { message: "Refund request not found" });
    }

    if (!canAppealRefund(row.status)) {
      throw new ORPCError("BAD_REQUEST", {
        message: "Only an auto-denied refund can be appealed",
      });
    }

    const slaDeadline = humanReviewSlaDeadline(
      new Date(),
      HUMAN_REVIEW_SLA_DAYS
    );

    const appealed = await db
      .update(refundRequest)
      .set({ path: "human_review", status: "human_review", slaDeadline })
      .where(
        and(
          eq(refundRequest.id, row.id),
          eq(refundRequest.status, "auto_denied")
        )
      )
      .returning();

    if (!appealed[0]) {
      throw new ORPCError("CONFLICT", {
        message: "Refund status changed; reload and try again",
      });
    }

    return { id: row.id, status: "human_review" as const, slaDeadline };
  });

const reviewRefund = adminProcedure
  .input(
    z.object({
      refundId: z.string().min(1),
      decision: z.enum(["approve", "deny"]),
      notes: z.string().max(2000).optional(),
    })
  )
  .handler(async ({ context, input }) => {
    const [row] = await db
      .select()
      .from(refundRequest)
      .where(eq(refundRequest.id, input.refundId))
      .limit(1);

    if (!row) {
      throw new ORPCError("NOT_FOUND", { message: "Refund request not found" });
    }

    if (!canReviewRefund(row.status)) {
      throw new ORPCError("CONFLICT", {
        message: `Refund in state ${row.status} cannot be reviewed`,
      });
    }

    const approved = input.decision === "approve";

    const reviewed = await db
      .update(refundRequest)
      .set({
        status: approved ? "approved" : "denied",
        reviewedBy: context.session.user.id,
        reviewedAt: new Date(),
        reviewNotes: input.notes,
        resolvedAt: new Date(),
      })
      .where(
        and(
          eq(refundRequest.id, row.id),
          inArray(refundRequest.status, ["human_review", "pending"])
        )
      )
      .returning();

    if (!reviewed[0]) {
      throw new ORPCError("CONFLICT", {
        message: "Refund status changed; reload and try again",
      });
    }

    return {
      id: row.id,
      status: approved ? ("approved" as const) : ("denied" as const),
    };
  });

const listPendingReviews = adminProcedure.handler(async () =>
  db
    .select()
    .from(refundRequest)
    .where(inArray(refundRequest.status, ["human_review", "pending"]))
    .orderBy(refundRequest.slaDeadline)
    .limit(100)
);

/**
 * `note` is written only when it adds something. The exhaustion path passes
 * `null` so it cannot overwrite the provider's verbatim `errorReason` from the
 * final attempt — that free text is the whole reason a human is being asked.
 */
async function escalateToHumanReview(
  refund: { id: string; status: RefundStatus; reviewNotes: string | null },
  now: Date,
  note: string | null
): Promise<RefundStatus> {
  const [updated] = await db
    .update(refundRequest)
    .set({
      status: "human_review",
      reviewNotes: note ?? refund.reviewNotes,
      slaDeadline: humanReviewSlaDeadline(now, HUMAN_REVIEW_SLA_DAYS),
    })
    .where(
      and(
        eq(refundRequest.id, refund.id),
        eq(refundRequest.status, refund.status)
      )
    )
    .returning({ status: refundRequest.status });

  if (!updated) {
    throw new ORPCError("CONFLICT", {
      message: "Refund status changed; reload and try again",
    });
  }

  return updated.status;
}

/** `refund_remarks` is merchant-visible and capped at 255 characters. */
function refundRemark(approvalReason: string | null): string {
  const remark = approvalReason
    ? `Refund approved — ${approvalReason}`
    : "Refund approved";

  return remark.slice(0, 255);
}

async function processRefundSettlement(refundId: string, now: Date) {
  const [row] = await db
    .select({
      id: refundRequest.id,
      status: refundRequest.status,
      refundAmount: refundRequest.refundAmount,
      approvalReason: refundRequest.approvalReason,
      reviewNotes: refundRequest.reviewNotes,
      providerRefundId: refundRequest.providerRefundId,
      providerRefundAttempts: refundRequest.providerRefundAttempts,
      lastRefundAttemptAt: refundRequest.lastRefundAttemptAt,
      chargeId: paymentTransaction.id,
      bankTranId: paymentTransaction.bankTranId,
      provider: subscription.provider,
    })
    .from(refundRequest)
    .leftJoin(
      paymentTransaction,
      eq(refundRequest.paymentTransactionId, paymentTransaction.id)
    )
    .leftJoin(subscription, eq(refundRequest.subscriptionId, subscription.id))
    .where(eq(refundRequest.id, refundId))
    .limit(1);

  if (!row) {
    throw new ORPCError("NOT_FOUND", { message: "Refund request not found" });
  }

  if (!isRefundSettleable(row.status)) {
    return {
      id: row.id,
      result: "skipped" as const,
      status: row.status,
      providerCalled: false,
      reason: `Refund in state ${row.status} may not settle`,
    };
  }

  const guard = decideRefundAttempt({
    attempts: row.providerRefundAttempts,
    lastAttemptAt: row.lastRefundAttemptAt,
    now,
  });

  if (guard.action === "exhaust") {
    const status = await escalateToHumanReview(row, now, null);

    return {
      id: row.id,
      result: "exhausted" as const,
      status,
      providerCalled: false,
    };
  }

  if (guard.action === "skip") {
    return {
      id: row.id,
      result: "skipped" as const,
      status: row.status,
      providerCalled: false,
      reason: guard.reason,
    };
  }

  const target = checkSettlementTarget({
    chargeFound: row.chargeId !== null,
    bankTranId: row.bankTranId,
    refundAmount: row.refundAmount,
    provider: row.provider,
  });

  if (!target.ok) {
    const status = await escalateToHumanReview(
      row,
      now,
      describeSettlementBlocker(target.blocker)
    );

    log.warn({
      action: "refund_settlement",
      message: "Refund blocked before the provider call",
      refundId: row.id,
      blocker: target.blocker,
    });

    return {
      id: row.id,
      result: "blocked" as const,
      status,
      providerCalled: false,
      blocker: target.blocker,
    };
  }

  const attemptsAfterAttempt = row.providerRefundAttempts + 1;

  const [claimed] = await db
    .update(refundRequest)
    .set({
      providerRefundAttempts: attemptsAfterAttempt,
      lastRefundAttemptAt: now,
    })
    .where(
      and(
        eq(refundRequest.id, row.id),
        eq(refundRequest.status, row.status),
        eq(refundRequest.providerRefundAttempts, row.providerRefundAttempts)
      )
    )
    .returning({ id: refundRequest.id });

  if (!claimed) {
    throw new ORPCError("CONFLICT", {
      message: "Refund status changed; reload and try again",
    });
  }

  const result = await sendRefundToProvider({
    bankTranId: target.bankTranId,
    amount: target.refundAmount,
    reason: refundRemark(row.approvalReason),
    provider: target.provider,
  });

  const outcome = classifyProviderOutcome(
    result.ok ? result.raw : { status: PROVIDER_CALL_FAILED }
  );
  const nextStatus = resolveSettlementStatus(outcome, attemptsAfterAttempt);
  const providerStatus = result.ok
    ? recordedProviderStatus(result.raw)
    : PROVIDER_CALL_FAILED;
  const errorReason = result.ok ? result.raw.errorReason : result.errorReason;

  const [settled] = await db
    .update(refundRequest)
    .set({
      status: nextStatus,
      providerRefundId:
        result.ok && result.refundId !== null
          ? result.refundId
          : row.providerRefundId,
      providerRefundStatus: providerStatus,
      reviewNotes:
        errorReason && errorReason.length > 0 ? errorReason : row.reviewNotes,
      ...(needsSlaReset(nextStatus)
        ? { slaDeadline: humanReviewSlaDeadline(now, HUMAN_REVIEW_SLA_DAYS) }
        : {}),
    })
    .where(eq(refundRequest.id, row.id))
    .returning({ status: refundRequest.status });

  if (!settled) {
    throw new ORPCError("CONFLICT", {
      message: "Refund row vanished mid-settlement",
    });
  }

  log.info({
    action: "refund_settlement",
    message: "Refund settlement attempt recorded",
    refundId: row.id,
    providerStatus,
    status: settled.status,
    attempts: attemptsAfterAttempt,
  });

  return {
    id: row.id,
    result: "attempted" as const,
    status: settled.status,
    providerCalled: true,
    attempts: attemptsAfterAttempt,
  };
}

const settleRefund = adminProcedure
  .input(z.object({ refundId: z.string().min(1) }))
  .handler(async ({ input }) =>
    processRefundSettlement(input.refundId, new Date())
  );

const pollSettlements = adminProcedure
  .input(
    z
      .object({
        limit: z.number().int().min(1).max(100).default(50),
      })
      .optional()
  )
  .handler(async ({ input }) => {
    const now = new Date();
    const batchLimit = input?.limit ?? 50;

    const candidates = await db
      .select({
        id: refundRequest.id,
        status: refundRequest.status,
        providerRefundAttempts: refundRequest.providerRefundAttempts,
        lastRefundAttemptAt: refundRequest.lastRefundAttemptAt,
        createdAt: refundRequest.createdAt,
      })
      .from(refundRequest)
      .where(inArray(refundRequest.status, ["approved", "auto_approved"]))
      .orderBy(refundRequest.createdAt)
      .limit(batchLimit);

    const partition = partitionPollerCandidates(candidates, now);

    let executed = 0;
    let skipped = partition.toSkip.length;
    let exhausted = 0;
    let errors = 0;

    for (const item of partition.toExhaust) {
      try {
        const [row] = await db
          .select({
            id: refundRequest.id,
            status: refundRequest.status,
            reviewNotes: refundRequest.reviewNotes,
          })
          .from(refundRequest)
          .where(eq(refundRequest.id, item.id))
          .limit(1);

        if (row && isRefundSettleable(row.status)) {
          await escalateToHumanReview(
            row,
            now,
            "Exhausted refund attempts across retry window"
          );
          exhausted++;
        }
      } catch {
        errors++;
      }
    }

    for (const item of partition.toExecute) {
      try {
        const res = await processRefundSettlement(item.id, now);
        if (res.result === "attempted") {
          executed++;
        } else if (res.result === "exhausted") {
          exhausted++;
        } else if (res.result === "skipped") {
          skipped++;
        }
      } catch {
        errors++;
      }
    }

    return {
      scanned: candidates.length,
      executed,
      skipped,
      exhausted,
      errors,
    };
  });

export const refundRouter = {
  appealRefund,
  getRefundStatus,
  listPendingReviews,
  pollSettlements,
  requestRefund,
  reviewRefund,
  settleRefund,
};
