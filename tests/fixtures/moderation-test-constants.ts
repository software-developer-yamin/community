/**
 * Shared test constants and helpers for moderation strike tests (Story 4.1).
 * RED PHASE: Constants are scaffolded but not yet consumed by active tests.
 */

/** Duration threshold: a call <30s is "short" and counts as a strike */
export const SHORT_CALL_MAX_SEC = 29;

/** Duration threshold: a call >=30s is "normal" and does NOT count as a strike */
export const NORMAL_CALL_MIN_SEC = 30;

/** Strike thresholds */
export const WARN_THRESHOLD = 3;
export const COOLDOWN_1H_THRESHOLD = 5;
export const COOLDOWN_24H_THRESHOLD = 10;

/** Strike decay period */
export const STRIKE_DECAY_DAYS = 30;
export const STRIKE_DECAY_MS = STRIKE_DECAY_DAYS * 24 * 60 * 60 * 1000;

/** Cooldown durations */
export const COOLDOWN_1H_MS = 60 * 60 * 1000;
export const COOLDOWN_24H_MS = 24 * 60 * 60 * 1000;

/** Moderation states */
export const MOD_STATE_CLEAN = "clean";
export const MOD_STATE_WARNED = "warned";
export const MOD_STATE_COOLDOWN_1H = "cooldown_1h";
export const MOD_STATE_COOLDOWN_24H = "cooldown_24h";
export const MOD_STATE_SUSPENDED = "suspended";
export const MOD_STATE_BANNED = "banned";

/**
 * API endpoint paths for moderation routes.
 * These will be active once the moderation router is implemented.
 */
export const MOD_API = {
  strikes: "/api/moderation/strikes",
  state: "/api/moderation/state",
} as const;

/** Call end reasons from the existing callRecord schema */
export const CALL_END_REASONS = [
  "disconnect",
  "explicit",
  "timeout",
  "connection_lost",
  "partner_ended",
] as const;

/** Strike reason values */
export const STRIKE_REASONS = ["short_disconnect"] as const;

/** Default timeout for moderation API assertions (ms) */
export const MOD_API_TIMEOUT = 10_000;
