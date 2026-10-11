/**
 * Unit tests for the refund settlement executor (Story 5-3f).
 *
 * Covers every row of the spec's I/O & edge-case matrix, plus the rule that an
 * unrecognised provider `status` escalates instead of silently parking the
 * refund in `processing`.
 *
 * No gateway, no database, no network: every decision the executor makes is a
 * pure function imported directly here, matching the other test files in this
 * package.
 *
 * Run from repo root:
 *   bun test packages/api/src/lib/__tests__/refund-executor.test.ts
 */

import { describe, expect, test } from "bun:test";

import type { RefundStatus } from "../refund-classifier";
import { isOpenRefundStatus } from "../refund-classifier";
import {
  checkSettlementTarget,
  classifyProviderOutcome,
  decideRefundAttempt,
  describeSettlementBlocker,
  humanReviewSlaDeadline,
  isRefundSettleable,
  MAX_REFUND_ATTEMPTS,
  needsSlaReset,
  PROVIDER_CALL_FAILED,
  PROVIDER_STATUS_UNREADABLE,
  REFUND_RETRY_WINDOW_MS,
  recordedProviderStatus,
  resolveSettlementStatus,
} from "../refund-executor";

const NOW = new Date("2026-10-12T00:00:00.000Z");
const HOUR_MS = 60 * 60 * 1000;

function ago(ms: number): Date {
  return new Date(NOW.getTime() - ms);
}

describe("classifyProviderOutcome", () => {
  test("5.3f-UNIT-009: raw 'refunded' settles as completed, terminally", () => {
    expect(classifyProviderOutcome({ status: "refunded" })).toEqual({
      status: "completed",
      terminal: true,
    });
  });

  test("5.3f-UNIT-010: raw 'success' settles as completed too", () => {
    // Initiation answers `success`; only a later status query answers
    // `refunded`. Both are the same business outcome.
    expect(classifyProviderOutcome({ status: "success" })).toEqual({
      status: "completed",
      terminal: true,
    });
  });

  test("5.3f-UNIT-011: raw 'pending' is in flight and stays retryable", () => {
    expect(classifyProviderOutcome({ status: "pending" })).toEqual({
      status: "processing",
      terminal: false,
    });
  });

  test("5.3f-UNIT-012: raw 'processing' is in flight and stays retryable", () => {
    expect(classifyProviderOutcome({ status: "processing" })).toEqual({
      status: "processing",
      terminal: false,
    });
  });

  test("5.3f-UNIT-013: raw 'failed' is a decline, not a settlement", () => {
    expect(classifyProviderOutcome({ status: "failed" })).toEqual({
      status: "approved",
      terminal: false,
    });
  });

  test("5.3f-UNIT-014: raw 'cancelled' escalates rather than denying", () => {
    // NOT `denied`: that status is in CLOSED_REFUND_STATUSES, so persisting it
    // would make isOpenRefundStatus false and let requestRefund accept a second
    // request against the same charge.
    expect(classifyProviderOutcome({ status: "cancelled" })).toEqual({
      status: "human_review",
      terminal: true,
    });
    expect(isOpenRefundStatus("human_review")).toBe(true);
  });

  test("5.3f-UNIT-015: a thrown call is retryable, not terminal", () => {
    // No response body means no business outcome. A transport failure says
    // nothing about whether the refund will settle.
    expect(classifyProviderOutcome({ status: PROVIDER_CALL_FAILED })).toEqual({
      status: "approved",
      terminal: false,
    });
  });

  test("5.3f-UNIT-016: status matching ignores case and padding", () => {
    expect(classifyProviderOutcome({ status: "  REFUNDED " }).status).toBe(
      "completed"
    );
    expect(classifyProviderOutcome({ status: "Failed" }).status).toBe(
      "approved"
    );
  });

  test("5.3f-UNIT-017: an unknown status is terminal, never pending", () => {
    // Parking an unreadable response in `processing` strands the refund with
    // no poller able to explain it.
    const outcome = classifyProviderOutcome({ status: "wat" });
    expect(outcome.terminal).toBe(true);
    expect(outcome.status).toBe("human_review");
  });

  test("5.3f-UNIT-018: a missing status is terminal, never pending", () => {
    for (const raw of [
      undefined,
      null,
      {},
      { APIConnect: "DONE" },
      { errorReason: "something" },
    ]) {
      const outcome = classifyProviderOutcome(raw);
      expect(outcome).toEqual({ status: "human_review", terminal: true });
    }
  });

  test("5.3f-UNIT-019: APIConnect alone never settles a refund", () => {
    // `DONE` means "authenticated and parsed". A body that is DONE *and*
    // failed is a decline, not a refund.
    expect(
      classifyProviderOutcome({ APIConnect: "DONE", status: "failed" })
    ).toEqual({ status: "approved", terminal: false });

    expect(
      classifyProviderOutcome({ APIConnect: "FAILED", status: "refunded" })
        .terminal
    ).toBe(true);
  });

  test("5.3f-UNIT-020: errorReason never changes the classification", () => {
    // Free text with no published codes. Two bodies identical apart from the
    // reason must classify identically.
    const withoutReason = classifyProviderOutcome({ status: "failed" });
    const withReason = classifyProviderOutcome({
      status: "failed",
      errorReason: "Account number mismatch. Contact support.",
    });
    expect(withReason).toEqual(withoutReason);
  });
});

describe("resolveSettlementStatus", () => {
  test("5.3f-UNIT-021: a completed refund stays completed at any attempt count", () => {
    const outcome = classifyProviderOutcome({ status: "refunded" });
    for (const attempts of [1, 2, MAX_REFUND_ATTEMPTS, 9]) {
      expect(resolveSettlementStatus(outcome, attempts)).toBe("completed");
    }
  });

  test("5.3f-UNIT-022: an in-flight refund is never escalated by attempts", () => {
    // The provider accepted it; the attempt count carries no failure signal.
    const outcome = classifyProviderOutcome({ status: "pending" });
    for (const attempts of [1, 2, MAX_REFUND_ATTEMPTS, 9]) {
      expect(resolveSettlementStatus(outcome, attempts)).toBe("processing");
    }
  });

  test("5.3f-UNIT-023: a decline stays approved while attempts remain", () => {
    const outcome = classifyProviderOutcome({ status: "failed" });
    expect(resolveSettlementStatus(outcome, 1)).toBe("approved");
    expect(resolveSettlementStatus(outcome, 2)).toBe("approved");
  });

  test("5.3f-UNIT-024: a decline on the third attempt falls to human review", () => {
    const outcome = classifyProviderOutcome({ status: "failed" });
    expect(resolveSettlementStatus(outcome, MAX_REFUND_ATTEMPTS)).toBe(
      "human_review"
    );
  });

  test("5.3f-UNIT-025: a thrown call escalates only once the budget is spent", () => {
    const outcome = classifyProviderOutcome({ status: PROVIDER_CALL_FAILED });
    expect(resolveSettlementStatus(outcome, 1)).toBe("approved");
    expect(resolveSettlementStatus(outcome, MAX_REFUND_ATTEMPTS)).toBe(
      "human_review"
    );
  });

  test("5.3f-UNIT-026: a terminal outcome ignores the attempt budget", () => {
    const outcome = classifyProviderOutcome({ status: "wat" });
    expect(resolveSettlementStatus(outcome, 1)).toBe("human_review");
    expect(resolveSettlementStatus(outcome, MAX_REFUND_ATTEMPTS)).toBe(
      "human_review"
    );
  });

  test("5.3f-UNIT-027: every resolved status is a member of refundStatusEnum", () => {
    const every: RefundStatus[] = [
      "pending",
      "auto_approved",
      "auto_denied",
      "human_review",
      "approved",
      "denied",
      "processing",
      "completed",
    ];
    const raws = [
      { status: "refunded" },
      { status: "pending" },
      { status: "failed" },
      { status: "cancelled" },
      { status: PROVIDER_CALL_FAILED },
      { status: "mystery" },
    ];
    for (const raw of raws) {
      for (const attempts of [1, MAX_REFUND_ATTEMPTS]) {
        const resolved = resolveSettlementStatus(
          classifyProviderOutcome(raw),
          attempts
        );
        expect(every).toContain(resolved);
      }
    }
  });
});

describe("decideRefundAttempt", () => {
  test("5.3f-UNIT-028: a fresh refund executes immediately", () => {
    expect(
      decideRefundAttempt({ attempts: 0, lastAttemptAt: null, now: NOW }).action
    ).toBe("execute");
  });

  test("5.3f-UNIT-029: an attempt inside the retry window is skipped", () => {
    const decision = decideRefundAttempt({
      attempts: 1,
      lastAttemptAt: ago(HOUR_MS),
      now: NOW,
    });
    expect(decision.action).toBe("skip");
  });

  test("5.3f-UNIT-030: an attempt exactly at the window boundary executes", () => {
    const decision = decideRefundAttempt({
      attempts: 1,
      lastAttemptAt: ago(REFUND_RETRY_WINDOW_MS),
      now: NOW,
    });
    expect(decision.action).toBe("execute");
  });

  test("5.3f-UNIT-031: one millisecond short of the window is still in flight", () => {
    const decision = decideRefundAttempt({
      attempts: 2,
      lastAttemptAt: ago(REFUND_RETRY_WINDOW_MS - 1),
      now: NOW,
    });
    expect(decision.action).toBe("skip");
  });

  test("5.3f-UNIT-032: a spent budget exhausts rather than skips", () => {
    // Exhaustion wins over the window: an escalated refund must not sit
    // waiting for a retry window that will never be used.
    for (const attempts of [MAX_REFUND_ATTEMPTS, MAX_REFUND_ATTEMPTS + 1]) {
      const decision = decideRefundAttempt({
        attempts,
        lastAttemptAt: ago(HOUR_MS),
        now: NOW,
      });
      expect(decision.action).toBe("exhaust");
    }
  });

  test("5.3f-UNIT-033: a lastAttemptAt in the future reads as in flight", () => {
    const decision = decideRefundAttempt({
      attempts: 1,
      lastAttemptAt: new Date(NOW.getTime() + 5 * HOUR_MS),
      now: NOW,
    });
    expect(decision.action).toBe("skip");
  });

  test("5.3f-UNIT-034: a stale attempt well past the window retries", () => {
    const decision = decideRefundAttempt({
      attempts: 2,
      lastAttemptAt: ago(20 * HOUR_MS),
      now: NOW,
    });
    expect(decision.action).toBe("execute");
  });

  test("5.3f-UNIT-035: the window spans the 24-hour envelope across three attempts", () => {
    expect(MAX_REFUND_ATTEMPTS).toBe(3);
    // Three attempts have two gaps between them, so the window is 24/2 — a
    // 24/3 window spans only 16 hours from the first attempt to the last.
    expect(REFUND_RETRY_WINDOW_MS).toBe(12 * HOUR_MS);
    expect(REFUND_RETRY_WINDOW_MS * (MAX_REFUND_ATTEMPTS - 1)).toBe(
      24 * HOUR_MS
    );
  });

  test("5.3f-UNIT-036: a never-attempted refund ignores the retry window", () => {
    // `lastRefundAttemptAt` is written in the same statement as the attempt
    // counter, so a null timestamp means "never attempted" regardless of how
    // far apart `now` and the clock are.
    const decision = decideRefundAttempt({
      attempts: 0,
      lastAttemptAt: null,
      now: NOW,
    });
    expect(decision.action).toBe("execute");
  });

  test("5.3f-UNIT-037: an attempt recorded at this instant is in flight", () => {
    const decision = decideRefundAttempt({
      attempts: 1,
      lastAttemptAt: NOW,
      now: NOW,
    });
    expect(decision.action).toBe("skip");
  });

  test("5.3f-UNIT-038: every decision carries a reason for the log", () => {
    const decisions = [
      decideRefundAttempt({ attempts: 0, lastAttemptAt: null, now: NOW }),
      decideRefundAttempt({
        attempts: 1,
        lastAttemptAt: ago(HOUR_MS),
        now: NOW,
      }),
      decideRefundAttempt({
        attempts: MAX_REFUND_ATTEMPTS,
        lastAttemptAt: ago(HOUR_MS),
        now: NOW,
      }),
    ];
    for (const decision of decisions) {
      expect(decision.reason.length).toBeGreaterThan(0);
    }
  });
});

describe("isRefundSettleable", () => {
  test("5.3f-UNIT-039: only approved and auto_approved may call the gateway", () => {
    expect(isRefundSettleable("approved")).toBe(true);
    expect(isRefundSettleable("auto_approved")).toBe(true);
  });

  test("5.3f-UNIT-040: every other local status is skipped", () => {
    const skipped: RefundStatus[] = [
      "pending",
      "auto_denied",
      "human_review",
      "denied",
      "processing",
      "completed",
    ];
    for (const status of skipped) {
      expect(isRefundSettleable(status)).toBe(false);
    }
  });

  test("5.3f-UNIT-041: an unknown status never reaches the gateway", () => {
    expect(isRefundSettleable("some_future_status")).toBe(false);
  });

  test("5.3f-UNIT-042: the settleable set is a subset of refundStatusEnum", () => {
    const every: RefundStatus[] = [
      "pending",
      "auto_approved",
      "auto_denied",
      "human_review",
      "approved",
      "denied",
      "processing",
      "completed",
    ];
    for (const status of every) {
      expect(typeof isRefundSettleable(status)).toBe("boolean");
    }
    expect(isRefundSettleable("approved")).toBe(true);
    expect(isRefundSettleable("auto_approved")).toBe(true);
  });
});

describe("checkSettlementTarget", () => {
  const healthy = {
    chargeFound: true,
    bankTranId: "BANK-123",
    refundAmount: 299,
    provider: "sslcommerz" as const,
  };

  test("5.3f-UNIT-043: a complete target yields the gateway arguments", () => {
    expect(checkSettlementTarget(healthy)).toEqual({
      ok: true,
      bankTranId: "BANK-123",
      refundAmount: 299,
      provider: "sslcommerz",
    });
  });

  test("5.3f-UNIT-044: a missing bank transaction id halts the refund", () => {
    expect(checkSettlementTarget({ ...healthy, bankTranId: null })).toEqual({
      ok: false,
      blocker: "missing_bank_tran_id",
    });
  });

  test("5.3f-UNIT-045: a missing charge row is reported before the missing id", () => {
    // Both produce a null bankTranId; the missing row is the real cause.
    expect(
      checkSettlementTarget({
        ...healthy,
        chargeFound: false,
        bankTranId: null,
      })
    ).toEqual({ ok: false, blocker: "missing_charge" });
  });

  test("5.3f-UNIT-046: a missing amount halts the refund", () => {
    for (const refundAmount of [null, 0, -1]) {
      expect(checkSettlementTarget({ ...healthy, refundAmount })).toEqual({
        ok: false,
        blocker: "missing_refund_amount",
      });
    }
  });

  test("5.3f-UNIT-047: a missing provider halts the refund", () => {
    expect(checkSettlementTarget({ ...healthy, provider: null })).toEqual({
      ok: false,
      blocker: "missing_provider",
    });
  });

  test("5.3f-UNIT-048: an empty bank transaction id is treated as missing", () => {
    expect(checkSettlementTarget({ ...healthy, bankTranId: "" })).toEqual({
      ok: false,
      blocker: "missing_bank_tran_id",
    });
  });

  test("5.3f-UNIT-049: every blocker has a human-readable reason", () => {
    const blockers = [
      "missing_charge",
      "missing_bank_tran_id",
      "missing_refund_amount",
      "missing_provider",
    ] as const;
    for (const blocker of blockers) {
      expect(describeSettlementBlocker(blocker).length).toBeGreaterThan(0);
    }
  });
});

describe("recordedProviderStatus", () => {
  test("5.3f-UNIT-057: the provider's own word is kept verbatim", () => {
    expect(recordedProviderStatus({ status: "refunded" })).toBe("refunded");
    expect(recordedProviderStatus({ status: " some_new_status " })).toBe(
      "some_new_status"
    );
  });

  test("5.3f-UNIT-058: an unreadable body is recorded as unknown", () => {
    for (const raw of [null, {}, { status: "" }, { status: "   " }]) {
      expect(recordedProviderStatus(raw)).toBe(PROVIDER_STATUS_UNREADABLE);
    }
  });

  test("5.3f-UNIT-059: the recorded word agrees with the classification", () => {
    // A row reading provider_call_failed beside status=human_review would tell
    // a reader the opposite of what happened: one is a retryable transport
    // failure, the other a terminal escalation.
    for (const raw of [null, {}, { status: "" }, { status: "   " }]) {
      expect(classifyProviderOutcome(raw).status).toBe("human_review");
      expect(recordedProviderStatus(raw)).not.toBe(PROVIDER_CALL_FAILED);
    }
  });
});

describe("SLA handling", () => {
  test("5.3f-UNIT-050: a human-review deadline is the full window out", () => {
    expect(humanReviewSlaDeadline(NOW, 7).toISOString()).toBe(
      new Date(NOW.getTime() + 7 * 24 * HOUR_MS).toISOString()
    );
  });

  test("5.3f-UNIT-051: only human review restarts the clock", () => {
    expect(needsSlaReset("human_review")).toBe(true);
    const others: RefundStatus[] = [
      "pending",
      "auto_approved",
      "auto_denied",
      "approved",
      "denied",
      "processing",
      "completed",
    ];
    for (const status of others) {
      expect(needsSlaReset(status)).toBe(false);
    }
  });
});

describe("the matrix, row by row", () => {
  test("5.3f-UNIT-052: provider refunds -> completed, nothing to escalate", () => {
    const outcome = classifyProviderOutcome({ status: "refunded" });
    expect(resolveSettlementStatus(outcome, 1)).toBe("completed");
    expect(needsSlaReset(resolveSettlementStatus(outcome, 1))).toBe(false);
  });

  test("5.3f-UNIT-053: provider in flight -> processing, attempts incremented", () => {
    const outcome = classifyProviderOutcome({ status: "pending" });
    expect(resolveSettlementStatus(outcome, 2)).toBe("processing");
  });

  test("5.3f-UNIT-054: declines exhaust into human review with a fresh SLA", () => {
    const outcome = classifyProviderOutcome({ status: "failed" });
    const settled = resolveSettlementStatus(outcome, MAX_REFUND_ATTEMPTS);
    expect(settled).toBe("human_review");
    expect(needsSlaReset(settled)).toBe(true);
  });

  test("5.3f-UNIT-055: exhaustion is decided before the retry window", () => {
    // Ordering matters: a spent budget inside its own window must escalate,
    // not wait out a retry that policy has already forbidden.
    const spentAndInFlight = decideRefundAttempt({
      attempts: MAX_REFUND_ATTEMPTS,
      lastAttemptAt: ago(REFUND_RETRY_WINDOW_MS / 2),
      now: NOW,
    });
    expect(spentAndInFlight.action).toBe("exhaust");

    const budgetLeftAndInFlight = decideRefundAttempt({
      attempts: MAX_REFUND_ATTEMPTS - 1,
      lastAttemptAt: ago(REFUND_RETRY_WINDOW_MS / 2),
      now: NOW,
    });
    expect(budgetLeftAndInFlight.action).toBe("skip");
  });

  test("5.3f-UNIT-056: a blocked refund is decided before any provider call", () => {
    const target = checkSettlementTarget({
      chargeFound: true,
      bankTranId: null,
      refundAmount: 299,
      provider: "sslcommerz",
    });
    expect(target).toEqual({ ok: false, blocker: "missing_bank_tran_id" });

    // The guard is a separate decision from the attempt guard, so a blocked
    // refund never reaches an outcome at all — it cannot be completed.
    if (target.ok) {
      throw new Error("a refund with no bank id must never be sent");
    }

    expect(target.blocker).not.toBeNull();
  });
});
