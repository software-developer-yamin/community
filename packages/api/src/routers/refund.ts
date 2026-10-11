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
import { z } from "zod";

import { adminProcedure, protectedProcedure } from "../index";
import {
  AUTO_DENY_DAYS_SINCE_CHARGE,
  classifyRefundRequest,
  daysBetween,
  hoursBetween,
  type RefundClassifierInput,
} from "../lib/refund-classifier";

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

async function latestCompletedCharge(userId: string) {
  const [charge] = await db
    .select({
      id: paymentTransaction.id,
      amount: paymentTransaction.amount,
      completedAt: paymentTransaction.completedAt,
      createdAt: paymentTransaction.createdAt,
    })
    .from(paymentTransaction)
    .where(
      and(
        eq(paymentTransaction.userId, userId),
        eq(paymentTransaction.status, "completed")
      )
    )
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

    const charge = await latestCompletedCharge(userId);
    if (!charge) {
      throw new ORPCError("BAD_REQUEST", {
        message: "No completed payment found for this subscription",
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
      })
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

    if (row.status !== "auto_denied") {
      throw new ORPCError("BAD_REQUEST", {
        message: "Only an auto-denied refund can be appealed",
      });
    }

    const slaDeadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await db
      .update(refundRequest)
      .set({ path: "human_review", status: "human_review", slaDeadline })
      .where(eq(refundRequest.id, row.id));

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

    const approved = input.decision === "approve";

    await db
      .update(refundRequest)
      .set({
        status: approved ? "approved" : "denied",
        reviewedBy: context.session.user.id,
        reviewedAt: new Date(),
        reviewNotes: input.notes,
        resolvedAt: new Date(),
      })
      .where(eq(refundRequest.id, row.id));

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

export const refundRouter = {
  appealRefund,
  getRefundStatus,
  listPendingReviews,
  requestRefund,
  reviewRefund,
};
