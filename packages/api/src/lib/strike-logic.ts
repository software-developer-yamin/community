/**
 * Pure functions for the graduated strike system.
 *
 * All functions are stateless — they compute state from inputs without side effects.
 * This makes them independently unit-testable.
 */

// ─── Thresholds ───────────────────────────────────────────────────────────

export const SHORT_CALL_THRESHOLD_SEC = 30;
export const WARN_THRESHOLD = 3;
export const COOLDOWN_1H_THRESHOLD = 5;
export const COOLDOWN_24H_THRESHOLD = 10;
export const STRIKE_DECAY_DAYS = 30;
export const COOLDOWN_1H_MS = 60 * 60 * 1000;
export const COOLDOWN_24H_MS = 24 * 60 * 60 * 1000;

// ─── Types ────────────────────────────────────────────────────────────────

export type CallDurationClass = "short" | "normal";

export type EndReason =
  | "disconnect"
  | "explicit"
  | "skip"
  | "partner_skipped"
  | "timeout"
  | "connection_lost"
  | "partner_ended";

export type ModerationState =
  | "clean"
  | "warned"
  | "cooldown_1h"
  | "cooldown_24h"
  | "suspended"
  | "banned";

export interface StrikeEvent {
  createdAt: Date;
  durationSec: number | null;
  voidedAt: Date | null;
}

export interface ModerationResult {
  cooldownUntil: Date | null;
  flaggedForReview: boolean;
  state: ModerationState;
}

export interface StrikeState {
  cooldownUntil: Date | null;
  flaggedForReview: boolean;
  lastStrikeAt: Date | null;
  state: ModerationState;
  strikeCount: number;
}

/**
 * Human-readable description of the moderation state.
 * Returned alongside the machine-readable state so the client can render
 * the account standing section without duplicating state-to-text logic.
 */
export interface ReadableState {
  /** Short heading, e.g. "Good standing", "Account banned" */
  label: string;
  /** Plain-language explanation interpolating strike count / ban reason */
  description: string;
  /** Optional call-to-action label when user action is needed */
  action: string | null;
  /** Optional CTA link when user action is needed */
  actionLink: string | null;
}

// ─── Classification ───────────────────────────────────────────────────────

/**
 * Classify call duration as "short" (<30s) or "normal" (>=30s).
 */
export function classifyCallDuration(durationSec: number): CallDurationClass {
  return durationSec < SHORT_CALL_THRESHOLD_SEC ? "short" : "normal";
}

/**
 * Determine whether a call end event should count as a strike.
 *
 * Only "disconnect" with duration <30s counts.
 * "explicit", "partner_ended", "timeout", "connection_lost" are never strikes.
 * NULL duration is treated as normal (no strike).
 */
export function shouldCountAsStrike(
  endReason: EndReason,
  durationSec: number | null
): boolean {
  if (endReason !== "disconnect") {
    return false;
  }
  if (durationSec === null) {
    return false;
  }
  return classifyCallDuration(durationSec) === "short";
}

// ─── State Machine ────────────────────────────────────────────────────────

/**
 * Determine the moderation state based on the number of active strikes (within 24h).
 *
 * - 0-2 strikes: clean (no action)
 * - 3-4 strikes: warned (non-blocking warning)
 * - 5-9 strikes: cooldown_1h (1-hour queue block)
 * - 10+ strikes: cooldown_24h (24-hour queue block + flagged for human review)
 */
/**
 * Compute a human-readable description of the moderation state.
 *
 * Returns a {@link ReadableState} with a short label, a plain-language
 * description (interpolating strike count or ban reason when relevant),
 * and an optional CTA action/link for states that require user action.
 */
export function computeReadableState(
  state: ModerationState,
  strikeCount: number,
  banReason?: string | null
): ReadableState {
  switch (state) {
    case "clean":
      return {
        label: "Good standing",
        description: "You're all set! Your account is in good standing.",
        action: null,
        actionLink: null,
      };
    case "warned":
      return {
        label: "Warning — strikes accumulated",
        description: `You have ${strikeCount} active ${strikeCount === 1 ? "strike" : "strikes"}. Please review the community guidelines to keep future calls positive.`,
        action: "Learn more",
        actionLink: "/help/moderation",
      };
    case "cooldown_1h":
      return {
        label: "Temporary cooldown",
        description:
          "Your ability to make calls has been temporarily paused for 1 hour due to multiple recent disconnections.",
        action: null,
        actionLink: null,
      };
    case "cooldown_24h":
      return {
        label: "Extended cooldown",
        description:
          "Your account has been flagged for review. Calls are paused for 24 hours while our team reviews your recent activity.",
        action: null,
        actionLink: null,
      };
    case "suspended":
      return {
        label: "Account suspended",
        description:
          "Your account is suspended pending review by our team. This usually resolves within 24 hours.",
        action: "Contact support",
        actionLink: "/support",
      };
    case "banned":
      return {
        label: "Account banned",
        description: banReason
          ? `Your account has been banned. Reason: ${banReason}`
          : "Your account has been banned. If you believe this is an error, please contact support.",
        action: "Contact support",
        actionLink: "/support",
      };
  }
}

export function determineModerationState(
  activeStrikeCount: number
): ModerationResult {
  if (activeStrikeCount >= COOLDOWN_24H_THRESHOLD) {
    return {
      state: "cooldown_24h",
      cooldownUntil: new Date(Date.now() + COOLDOWN_24H_MS),
      flaggedForReview: true,
    };
  }

  if (activeStrikeCount >= COOLDOWN_1H_THRESHOLD) {
    return {
      state: "cooldown_1h",
      cooldownUntil: new Date(Date.now() + COOLDOWN_1H_MS),
      flaggedForReview: false,
    };
  }

  if (activeStrikeCount >= WARN_THRESHOLD) {
    return {
      state: "warned",
      cooldownUntil: null,
      flaggedForReview: false,
    };
  }

  return {
    state: "clean",
    cooldownUntil: null,
    flaggedForReview: false,
  };
}

// ─── Strike Counting ──────────────────────────────────────────────────────

/**
 * Count active strikes within a rolling 24-hour window.
 * Excludes voided strikes.
 */
export function computeActiveStrikes24h(
  strikes: StrikeEvent[],
  now: Date
): number {
  const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  return strikes.filter((s) => s.createdAt >= cutoff && s.voidedAt === null)
    .length;
}

// ─── Decay ────────────────────────────────────────────────────────────────

/**
 * Check if the strike count should be decayed (30+ days since last check).
 */
export function shouldDecayStrikes(
  lastDecayCheck: Date | null,
  now: Date
): boolean {
  if (lastDecayCheck === null) {
    return true;
  }
  const diffMs = now.getTime() - lastDecayCheck.getTime();
  return diffMs >= STRIKE_DECAY_DAYS * 24 * 60 * 60 * 1000;
}

/**
 * Calculate the next strike state after decay evaluation.
 *
 * Strikes older than 30 days from `now` are cleared.
 * Returns the count of remaining (recent) strikes and the new moderation state.
 */
export function computeDecayedState(
  strikes: StrikeEvent[],
  now: Date
): {
  recentStrikes: StrikeEvent[];
  activeCount: number;
  result: ModerationResult;
} {
  const cutoff = new Date(
    now.getTime() - STRIKE_DECAY_DAYS * 24 * 60 * 60 * 1000
  );
  const recentStrikes = strikes.filter(
    (s) => s.createdAt >= cutoff && s.voidedAt === null
  );
  const activeCount = recentStrikes.length;
  return {
    recentStrikes,
    activeCount,
    result: determineModerationState(activeCount),
  };
}
