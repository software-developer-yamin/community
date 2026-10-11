/**
 * Pure decisions for settling an approved refund against the payment provider.
 *
 * Nothing in this file performs IO. The provider call lives in
 * `refund-provider.ts` and the persistence lives in `routers/refund.ts`, so the
 * whole guard + outcome matrix is unit-testable without a gateway and without a
 * database — `gateway` is a module-level singleton with no test double in this
 * repo, which is why every decision it feeds is hoisted out here.
 *
 * The library this sits on top of (`@foxses/pay-sslcommerz`) has three known
 * defects that this module is written against:
 *
 *  1. It derives `refund_trans_id` as `REFUND-${Date.now()}`, so every attempt
 *     is a distinct gateway dedup key and a retry after a timeout can execute a
 *     second real refund. The attempt guard below is what makes re-execution
 *     safe; the library is not forked.
 *  2. It reduces the provider's business outcome to `"refunded" | "pending"`, so
 *     a decline is indistinguishable from an in-flight refund. That is why
 *     `classifyProviderOutcome` reads the raw body instead of the typed field.
 *  3. It passes `params.amount.toFixed(2)` straight through. Amounts here are
 *     already major units, so nothing may divide them on the way out.
 */

import type { SupportedProvider } from "@foxses/pay";

import type { RefundStatus } from "./refund-classifier";

/** Hard ceiling on provider calls per refund request. */
export const MAX_REFUND_ATTEMPTS = 3;

/**
 * FR-20 retry policy: "retries up to 3 times over 24 hours". Spreading the
 * three attempts evenly across that envelope is an 8-hour window — an attempt
 * made sooner is treated as in flight and skipped.
 */
export const REFUND_RETRY_WINDOW_MS =
  (24 / (MAX_REFUND_ATTEMPTS - 1)) * 60 * 60 * 1000;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Sentinel `status` for an attempt that never produced a response body — the
 * call threw. Namespaced so it cannot collide with a real provider status.
 */
export const PROVIDER_CALL_FAILED = "provider_call_failed";

/** Statuses that may still move money. Anything else must never reach the gateway. */
const SETTLEABLE_REFUND_STATUSES: readonly RefundStatus[] = [
  "approved",
  "auto_approved",
];

export function isRefundSettleable(status: string): boolean {
  return SETTLEABLE_REFUND_STATUSES.includes(status as RefundStatus);
}

/**
 * Raw provider body, as the gateway hands it back. Every field is optional:
 * SSLCommerz omits keys rather than sending nulls, and `refund_ref_id` is
 * absent whenever initiation fails.
 */
export interface ProviderRefundRaw {
  APIConnect?: string;
  errorReason?: string;
  refund_ref_id?: string;
  status?: string;
  [key: string]: unknown;
}

export interface ProviderOutcome {
  /** Local `refundRequest.status` implied by the provider's answer. */
  status: RefundStatus;
  /**
   * Whether the executor must stop retrying.
   *
   * `completed` and `denied` are final. A decline is not terminal on its own —
   * it stays approved so the next attempt can try again — but it does become
   * terminal once the attempt budget is spent.
   */
  terminal: boolean;
}

export type RefundAttemptAction = "execute" | "skip" | "exhaust";

export interface RefundAttemptDecision {
  action: RefundAttemptAction;
  /** Human-readable explanation, logged by the caller. Never a branch condition. */
  reason: string;
}

export interface RefundAttemptInput {
  attempts: number;
  lastAttemptAt: Date | null;
  now: Date;
}

/** A reason this refund can never reach the gateway, or null when it can. */
export type SettlementBlocker =
  | "missing_charge"
  | "missing_bank_tran_id"
  | "missing_refund_amount"
  | "missing_provider";

export interface SettlementTarget {
  bankTranId: string | null;
  /** Whether the joined `paymentTransaction` row exists at all. */
  chargeFound: boolean;
  provider: SupportedProvider | null;
  refundAmount: number | null;
}

export type SettlementTargetCheck =
  | {
      ok: true;
      bankTranId: string;
      refundAmount: number;
      provider: SupportedProvider;
    }
  | { ok: false; blocker: SettlementBlocker };

/** Human-readable text for a blocker. Recorded, never branched on downstream. */
const BLOCKER_MESSAGE: Record<SettlementBlocker, string> = {
  missing_charge:
    "The refund is not linked to a payment transaction, so there is nothing to reverse.",
  missing_bank_tran_id:
    "The source charge has no bank transaction id, so the payment provider cannot identify it. Refund must be issued manually.",
  missing_refund_amount:
    "The refund request records no amount, so the payment provider cannot be told how much to return.",
  missing_provider:
    "The subscription records no payment provider, so the refund cannot be routed to a gateway.",
};

/**
 * Whether this refund may still call the gateway, and with which arguments.
 *
 * `bank_tran_id` is mandatory on an SSLCommerz refund and is *not* `tran_id`;
 * the two are different identifiers and only the former is accepted. A legacy
 * `paymentTransaction` row can carry a null `bankTranId`, and guessing one would
 * refund the wrong charge — so a missing id halts instead.
 *
 * Returns the narrowed arguments on success so the caller cannot pass a null
 * amount or provider to the gateway.
 */
export function checkSettlementTarget(
  target: SettlementTarget
): SettlementTargetCheck {
  if (!target.chargeFound) {
    return { ok: false, blocker: "missing_charge" };
  }

  if (!target.bankTranId) {
    return { ok: false, blocker: "missing_bank_tran_id" };
  }

  if (target.refundAmount === null || target.refundAmount <= 0) {
    return { ok: false, blocker: "missing_refund_amount" };
  }

  if (!target.provider) {
    return { ok: false, blocker: "missing_provider" };
  }

  return {
    ok: true,
    bankTranId: target.bankTranId,
    refundAmount: target.refundAmount,
    provider: target.provider,
  };
}

export function describeSettlementBlocker(blocker: SettlementBlocker): string {
  return BLOCKER_MESSAGE[blocker];
}

/**
 * Whether the next settlement run may call the gateway.
 *
 * Exhaustion is evaluated before the retry window so a fully spent budget
 * escalates even when the last attempt is still inside its window. A
 * `lastAttemptAt` in the future (clock skew) also reads as "in flight", because
 * a negative elapsed time is shorter than the window.
 */
export function decideRefundAttempt({
  attempts,
  lastAttemptAt,
  now,
}: RefundAttemptInput): RefundAttemptDecision {
  if (attempts >= MAX_REFUND_ATTEMPTS) {
    return {
      action: "exhaust",
      reason: `Attempt budget spent: ${attempts}/${MAX_REFUND_ATTEMPTS}`,
    };
  }

  if (lastAttemptAt) {
    const elapsedMs = now.getTime() - lastAttemptAt.getTime();

    if (elapsedMs < REFUND_RETRY_WINDOW_MS) {
      const waitedMinutes = Math.max(elapsedMs, 0) / 60_000;

      return {
        action: "skip",
        reason: `Attempt in flight: ${Math.round(waitedMinutes)}m of ${REFUND_RETRY_WINDOW_MS / 3_600_000}h window elapsed`,
      };
    }
  }

  return {
    action: "execute",
    reason:
      attempts === 0
        ? "First attempt"
        : `Retry ${attempts + 1}/${MAX_REFUND_ATTEMPTS} after the retry window`,
  };
}

/**
 * Reads the provider's own business outcome out of the raw body.
 *
 * `APIConnect` is deliberately ignored. It describes transport and auth
 * (`DONE` means "authenticated and parsed"), not settlement — a response can
 * be `APIConnect: "DONE"` and `status: "failed"` at the same time, and
 * treating `DONE` as success is exactly the defect this classifier exists to
 * avoid.
 *
 * An unrecognised `status` is terminal rather than pending. Mapping it to
 * pending would park the refund in `processing` forever with no poller able to
 * explain it; escalating to `human_review` keeps it visible and retryable by a
 * person. `errorReason` is free text with no published failure codes, so it is
 * recorded verbatim by the caller and never inspected here.
 */
export function classifyProviderOutcome(
  raw: ProviderRefundRaw | null | undefined
): ProviderOutcome {
  const status = raw?.status?.trim().toLowerCase();

  switch (status) {
    // Initiation answers `success`; a later status query answers `refunded`;
    // the collapsed typed field the adapter falls back to uses `completed`.
    case "refunded":
    case "success":
    case "completed":
      return { status: "completed", terminal: true };

    // Initiation answers `processing`; a later status query answers `pending`.
    case "pending":
    case "processing":
      return { status: "processing", terminal: false };

    // A decline moves no money and is worth another attempt.
    case "failed":
      return { status: "approved", terminal: false };

    // A provider cancellation is NOT a local denial. `denied` is in
    // CLOSED_REFUND_STATUSES, so persisting it here would make
    // `isOpenRefundStatus` false and let `requestRefund` accept a second
    // request against the same charge — reopening the double-payout path the
    // duplicate guard exists to close. Escalating keeps it visible to a human.
    case "cancelled":
      return { status: "human_review", terminal: true };

    // No body at all: the call threw, so there is no business outcome to read.
    // Retryable, because a transport failure says nothing about the refund.
    case PROVIDER_CALL_FAILED:
      return { status: "approved", terminal: false };

    default:
      return { status: "human_review", terminal: true };
  }
}

/**
 * The status to persist after an attempt has been recorded.
 *
 * `attemptsAfterAttempt` is the attempt count *including* the attempt just
 * made, so a decline on the third attempt lands on `human_review` and restarts
 * the review SLA instead of retrying forever.
 */
export function resolveSettlementStatus(
  outcome: ProviderOutcome,
  attemptsAfterAttempt: number
): RefundStatus {
  if (outcome.terminal) {
    return outcome.status;
  }

  // An accepted, in-flight refund is not a failure. Its attempt count says
  // nothing about whether the money will arrive, so it must not be escalated.
  if (outcome.status === "processing") {
    return "processing";
  }

  return attemptsAfterAttempt >= MAX_REFUND_ATTEMPTS
    ? "human_review"
    : outcome.status;
}

/** Label for a body that carries no usable status at all. Distinct from
 *  PROVIDER_CALL_FAILED, which means the call itself threw. */
export const PROVIDER_STATUS_UNREADABLE = "unknown";

/**
 * The provider's own vocabulary, kept verbatim in `providerRefundStatus` so a
 * human reading the row sees what the gateway actually said — including a
 * status this build has never heard of. Nothing branches on the result.
 *
 * An absent or blank status records PROVIDER_STATUS_UNREADABLE rather than
 * PROVIDER_CALL_FAILED, because `classifyProviderOutcome` treats the same body
 * as a terminal escalation, not a retryable transport failure. Recording the
 * latter would put `provider_call_failed` beside `status = human_review` and
 * tell a reader the opposite of what happened.
 */
export function recordedProviderStatus(raw: ProviderRefundRaw | null): string {
  const status = raw?.status?.trim();

  return status && status.length > 0 ? status : PROVIDER_STATUS_UNREADABLE;
}

/** A fresh human-review decision SLA, counted from `now`. */
export function humanReviewSlaDeadline(now: Date, slaDays: number): Date {
  return new Date(now.getTime() + slaDays * DAY_MS);
}

/**
 * Whether escalating to `status` also restarts the decision SLA. A human is
 * being asked for the first time, so the clock starts now.
 */
export function needsSlaReset(status: RefundStatus): boolean {
  return status === "human_review";
}
