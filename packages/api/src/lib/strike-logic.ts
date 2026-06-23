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
