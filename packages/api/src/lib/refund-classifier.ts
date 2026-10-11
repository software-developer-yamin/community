/**
 * Pure functions for the three-path refund classifier (FR-20).
 *
 * All functions are stateless — they compute a decision from inputs without
 * side effects. This makes the full threshold matrix unit-testable without a
 * database or a payment gateway.
 */

export const CRASH_AUTO_APPROVE_COUNT = 3;
export const CRASH_AUTO_APPROVE_WINDOW_DAYS = 7;
export const NEVER_CONNECTED_WINDOW_DAYS = 14;
export const LOGIN_FAILURE_HOURS = 72;
export const AUTO_DENY_SESSION_COUNT = 5;
export const AUTO_DENY_DAYS_SINCE_CHARGE = 14;
export const HUMAN_REVIEW_SLA_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

export type RefundPath = "auto_approve" | "auto_deny" | "human_review";

export type CrashType = "force_close" | "anr" | "black_screen";

export interface RefundClassifierInput {
  completedSessionCount: number;
  crashCount: number;
  daysSinceCharge: number;
  everCompletedSession: boolean;
  hasOpenLoginFailureTicket: boolean;
  hoursSinceLastSuccessfulLogin: number | null;
}

export interface RefundClassification {
  path: RefundPath;
  reason: string;
  slaDeadline: Date | null;
}

export const REFUND_DENIAL_TEMPLATE =
  "We can't issue a refund because [reason]. If you think this is wrong, reply to this thread — a human will look at it within 7 days.";

/**
 * A crash qualifies only within the first week of the charge. Past that window
 * a crash is the user's environment, not a broken product.
 */
function crashAutoApproves(input: RefundClassifierInput): boolean {
  return (
    input.daysSinceCharge <= CRASH_AUTO_APPROVE_WINDOW_DAYS &&
    input.crashCount >= CRASH_AUTO_APPROVE_COUNT
  );
}

function neverConnectedAutoApproves(input: RefundClassifierInput): boolean {
  return (
    !input.everCompletedSession &&
    input.daysSinceCharge <= NEVER_CONNECTED_WINDOW_DAYS
  );
}

/**
 * Requires an open ticket: the user must have told us they cannot log in.
 * A 72-hour gap in successful logins on its own is not a fault report.
 *
 * Bounded by NEVER_CONNECTED_WINDOW_DAYS like the other two auto-approve
 * rows. Without this cap a year-old charge with any open ticket auto-approves
 * a full refund, and auto-approve is evaluated before auto-deny — so the
 * session-count and age protections never get a chance to run.
 */
function loginFailureAutoApproves(input: RefundClassifierInput): boolean {
  return (
    input.daysSinceCharge <= NEVER_CONNECTED_WINDOW_DAYS &&
    input.hasOpenLoginFailureTicket &&
    input.hoursSinceLastSuccessfulLogin !== null &&
    input.hoursSinceLastSuccessfulLogin >= LOGIN_FAILURE_HOURS
  );
}

/**
 * AND, not OR — resolved 2026-10-11. The PRD contradicted itself: §4.5 said
 * ">5 sessions" while addendum §B said ">=1 session". The addendum rule would
 * auto-deny the exact user FR-20 exists to protect: one short call followed by
 * 72 hours of login failure. Either condition alone now routes to human review.
 */
function autoDenies(input: RefundClassifierInput): boolean {
  return (
    input.completedSessionCount > AUTO_DENY_SESSION_COUNT &&
    input.daysSinceCharge > AUTO_DENY_DAYS_SINCE_CHARGE
  );
}

/**
 * Classifies a refund request into one of the three FR-20 paths.
 *
 * Auto-approve is evaluated first and wins over auto-deny, so a heavy user
 * still crashing repeatedly in week one receives the refund rather than a
 * denial on session count.
 */
export function classifyRefundRequest(
  input: RefundClassifierInput,
  now: Date = new Date()
): RefundClassification {
  if (crashAutoApproves(input)) {
    return {
      path: "auto_approve",
      slaDeadline: null,
      reason: `${input.crashCount} critical crashes in the first ${CRASH_AUTO_APPROVE_WINDOW_DAYS} days`,
    };
  }

  if (neverConnectedAutoApproves(input)) {
    return {
      path: "auto_approve",
      slaDeadline: null,
      reason: `No completed session within ${NEVER_CONNECTED_WINDOW_DAYS} days of purchase`,
    };
  }

  if (loginFailureAutoApproves(input)) {
    return {
      path: "auto_approve",
      slaDeadline: null,
      reason: `Unable to sign in for ${Math.floor(input.hoursSinceLastSuccessfulLogin ?? 0)} hours, reported in an open ticket`,
    };
  }

  if (autoDenies(input)) {
    return {
      path: "auto_deny",
      slaDeadline: null,
      reason: `${input.completedSessionCount} completed sessions and more than ${AUTO_DENY_DAYS_SINCE_CHARGE} days since the charge`,
    };
  }

  return {
    path: "human_review",
    slaDeadline: new Date(now.getTime() + HUMAN_REVIEW_SLA_DAYS * DAY_MS),
    reason: "Gray area — outside every automatic threshold",
  };
}

export function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / DAY_MS);
}

export function hoursBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / HOUR_MS);
}
