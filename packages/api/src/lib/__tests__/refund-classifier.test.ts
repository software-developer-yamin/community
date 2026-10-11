/**
 * Unit tests for the three-path refund classifier (Story 5.3 / #83).
 *
 * Covers every row of the resolved threshold matrix, the auto-approve
 * precedence rule, and the AND-rule that supersedes the contradictory
 * PRD §4.5 / addendum §B thresholds.
 *
 * Run from repo root:
 *   bun test packages/api/src/lib/__tests__/refund-classifier.test.ts
 */

import { describe, expect, test } from "bun:test";

import type { RefundClassifierInput } from "../refund-classifier";
import { classifyRefundRequest } from "../refund-classifier";

const NOW = new Date("2026-10-11T00:00:00.000Z");

function input(overrides: Partial<RefundClassifierInput> = {}) {
  return {
    crashCount: 0,
    daysSinceCharge: 3,
    everCompletedSession: true,
    hasOpenLoginFailureTicket: false,
    hoursSinceLastSuccessfulLogin: 1,
    completedSessionCount: 3,
    ...overrides,
  };
}

describe("classifyRefundRequest", () => {
  describe("auto_approve", () => {
    test("5.3d-UNIT-001: >=3 crashes within 7 days auto-approves", () => {
      const result = classifyRefundRequest(
        input({ crashCount: 3, daysSinceCharge: 2 }),
        NOW
      );
      expect(result.path).toBe("auto_approve");
    });

    test("5.3d-UNIT-002: 2 crashes does not auto-approve", () => {
      const result = classifyRefundRequest(
        input({ crashCount: 2, daysSinceCharge: 2 }),
        NOW
      );
      expect(result.path).toBe("human_review");
    });

    test("5.3d-UNIT-003: 3 crashes after day 7 falls out of the window", () => {
      const result = classifyRefundRequest(
        input({ crashCount: 3, daysSinceCharge: 8 }),
        NOW
      );
      expect(result.path).toBe("human_review");
    });

    test("5.3d-UNIT-004: exactly 7 days is still inside the crash window", () => {
      const result = classifyRefundRequest(
        input({ crashCount: 3, daysSinceCharge: 7 }),
        NOW
      );
      expect(result.path).toBe("auto_approve");
    });

    test("5.3d-UNIT-005: never completed a session within 14 days auto-approves", () => {
      const result = classifyRefundRequest(
        input({ everCompletedSession: false, completedSessionCount: 0 }),
        NOW
      );
      expect(result.path).toBe("auto_approve");
    });

    test("5.3d-UNIT-006: never-connected past day 14 falls through", () => {
      const result = classifyRefundRequest(
        input({
          everCompletedSession: false,
          completedSessionCount: 0,
          daysSinceCharge: 15,
        }),
        NOW
      );
      expect(result.path).toBe("human_review");
    });

    test("5.3d-UNIT-007: 72h login failure with an open ticket auto-approves", () => {
      const result = classifyRefundRequest(
        input({
          hasOpenLoginFailureTicket: true,
          hoursSinceLastSuccessfulLogin: 72,
        }),
        NOW
      );
      expect(result.path).toBe("auto_approve");
    });

    test("5.3d-UNIT-008: 71h login failure is under the threshold", () => {
      const result = classifyRefundRequest(
        input({
          hasOpenLoginFailureTicket: true,
          hoursSinceLastSuccessfulLogin: 71,
        }),
        NOW
      );
      expect(result.path).toBe("human_review");
    });

    test("5.3d-UNIT-009: a 72h gap with no open ticket does not auto-approve", () => {
      const result = classifyRefundRequest(
        input({
          hasOpenLoginFailureTicket: false,
          hoursSinceLastSuccessfulLogin: 200,
        }),
        NOW
      );
      expect(result.path).toBe("human_review");
    });

    test("5.3d-UNIT-010: never-signed-in (null) does not auto-approve", () => {
      const result = classifyRefundRequest(
        input({
          hasOpenLoginFailureTicket: true,
          hoursSinceLastSuccessfulLogin: null,
        }),
        NOW
      );
      expect(result.path).toBe("human_review");
    });
  });

  describe("auto_deny — the AND rule", () => {
    test("5.3d-UNIT-011: >5 sessions AND >14 days auto-denies", () => {
      const result = classifyRefundRequest(
        input({ completedSessionCount: 6, daysSinceCharge: 15 }),
        NOW
      );
      expect(result.path).toBe("auto_deny");
    });

    test("5.3d-UNIT-012: >5 sessions alone routes to human review, not denial", () => {
      const result = classifyRefundRequest(
        input({ completedSessionCount: 6, daysSinceCharge: 3 }),
        NOW
      );
      expect(result.path).toBe("human_review");
    });

    test("5.3d-UNIT-013: >14 days alone routes to human review, not denial", () => {
      const result = classifyRefundRequest(
        input({ completedSessionCount: 1, daysSinceCharge: 30 }),
        NOW
      );
      expect(result.path).toBe("human_review");
    });

    test("5.3d-UNIT-014: exactly 5 sessions is not >5, so no denial", () => {
      const result = classifyRefundRequest(
        input({ completedSessionCount: 5, daysSinceCharge: 30 }),
        NOW
      );
      expect(result.path).toBe("human_review");
    });

    test("5.3d-UNIT-015: exactly 14 days is not >14, so no denial", () => {
      const result = classifyRefundRequest(
        input({ completedSessionCount: 6, daysSinceCharge: 14 }),
        NOW
      );
      expect(result.path).toBe("human_review");
    });

    test("5.3d-UNIT-016: one session with a 72h login failure is never auto-denied", () => {
      const result = classifyRefundRequest(
        input({
          completedSessionCount: 1,
          daysSinceCharge: 40,
          hasOpenLoginFailureTicket: true,
          hoursSinceLastSuccessfulLogin: 96,
        }),
        NOW
      );
      expect(result.path).not.toBe("auto_deny");
    });

    test("5.3d-UNIT-024: login failure beyond the 14-day window goes to review", () => {
      const result = classifyRefundRequest(
        input({
          completedSessionCount: 1,
          daysSinceCharge: 40,
          hasOpenLoginFailureTicket: true,
          hoursSinceLastSuccessfulLogin: 96,
        }),
        NOW
      );
      expect(result.path).toBe("human_review");
      expect(result.slaDeadline).not.toBeNull();
    });

    test("5.3d-UNIT-025: login failure inside the 14-day window still auto-approves", () => {
      const result = classifyRefundRequest(
        input({
          completedSessionCount: 1,
          daysSinceCharge: 14,
          hasOpenLoginFailureTicket: true,
          hoursSinceLastSuccessfulLogin: 96,
        }),
        NOW
      );
      expect(result.path).toBe("auto_approve");
    });

    test("5.3d-UNIT-026: login failure at 15 days is outside the window", () => {
      const result = classifyRefundRequest(
        input({
          completedSessionCount: 1,
          daysSinceCharge: 15,
          hasOpenLoginFailureTicket: true,
          hoursSinceLastSuccessfulLogin: 96,
        }),
        NOW
      );
      expect(result.path).toBe("human_review");
    });
  });

  describe("precedence", () => {
    test("5.3d-UNIT-017: auto-approve beats auto-deny on session count", () => {
      const result = classifyRefundRequest(
        input({
          crashCount: 5,
          daysSinceCharge: 2,
          completedSessionCount: 40,
        }),
        NOW
      );
      expect(result.path).toBe("auto_approve");
    });

    test("5.3d-UNIT-018: never-connected beats a high session count", () => {
      const result = classifyRefundRequest(
        input({ everCompletedSession: false, completedSessionCount: 99 }),
        NOW
      );
      expect(result.path).toBe("auto_approve");
    });
  });

  describe("human_review", () => {
    test("5.3d-UNIT-019: gray area gets a 7-day SLA deadline", () => {
      const result = classifyRefundRequest(input(), NOW);
      expect(result.path).toBe("human_review");
      expect(result.slaDeadline).not.toBeNull();
    });

    test("5.3d-UNIT-020: SLA deadline is exactly 7 days out", () => {
      const result = classifyRefundRequest(input(), NOW);
      const expected = new Date(NOW.getTime() + 7 * 24 * 60 * 60 * 1000);
      expect(result.slaDeadline?.toISOString()).toBe(expected.toISOString());
    });

    test("5.3d-UNIT-021: every path returns a non-empty reason", () => {
      const paths = [
        input({ crashCount: 3 }),
        input({ everCompletedSession: false }),
        input({
          hasOpenLoginFailureTicket: true,
          hoursSinceLastSuccessfulLogin: 100,
        }),
        input({ completedSessionCount: 9, daysSinceCharge: 20 }),
        input(),
      ];
      for (const seed of paths) {
        const result = classifyRefundRequest(seed, NOW);
        expect(result.reason.length).toBeGreaterThan(0);
      }
    });
  });

  describe("SLA deadline is absent outside human review", () => {
    test("5.3d-UNIT-022: auto_approve has no SLA deadline", () => {
      const result = classifyRefundRequest(input({ crashCount: 3 }), NOW);
      expect(result.slaDeadline).toBeNull();
    });

    test("5.3d-UNIT-023: auto_deny has no SLA deadline", () => {
      const result = classifyRefundRequest(
        input({ completedSessionCount: 9, daysSinceCharge: 20 }),
        NOW
      );
      expect(result.slaDeadline).toBeNull();
    });
  });
});
