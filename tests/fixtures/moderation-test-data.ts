/**
 * Test data builders for moderation strike tests (Story 4.1).
 * RED PHASE: Helpers are scaffolded but not yet consumed by active tests.
 *
 * Green phase: replace with real API calls once the moderation router exists.
 */

import {
  COOLDOWN_1H_MS,
  COOLDOWN_24H_MS,
  NORMAL_CALL_MIN_SEC,
  SHORT_CALL_MAX_SEC,
  STRIKE_DECAY_MS,
} from "./moderation-test-constants";

/** A simulated call-end event for testing strike logic */
export interface CallEndEvent {
  durationSec: number;
  endReason:
    | "disconnect"
    | "explicit"
    | "timeout"
    | "connection_lost"
    | "partner_ended";
  timestamp: Date;
  userId: string;
}

/** A simulated strike event returned by the API */
export interface StrikeEvent {
  createdAt: string;
  durationSec: number;
  id: string;
  reason: "short_disconnect";
  userId: string;
}

/** Moderation state returned by the API */
export interface ModerationState {
  cooldownUntil: string | null;
  flaggedForReview: boolean;
  state:
    | "clean"
    | "warned"
    | "cooldown_1h"
    | "cooldown_24h"
    | "suspended"
    | "banned";
  strikeCount: number;
}

/**
 * Build a short disconnect event (<30s) that should count as a strike.
 */
export function shortDisconnect(
  userId: string,
  overrides?: Partial<CallEndEvent>
): CallEndEvent {
  return {
    userId,
    endReason: "disconnect",
    durationSec: SHORT_CALL_MAX_SEC,
    timestamp: new Date(),
    ...overrides,
  };
}

/**
 * Build a normal call-end event (>=30s) that should NOT count as a strike.
 */
export function normalCallEnd(
  userId: string,
  overrides?: Partial<CallEndEvent>
): CallEndEvent {
  return {
    userId,
    endReason: "explicit",
    durationSec: NORMAL_CALL_MIN_SEC,
    timestamp: new Date(),
    ...overrides,
  };
}

/**
 * Build a sequence of short disconnects for testing graduated response.
 * Each event is spaced 1 second apart by default.
 */
export function buildStrikeSequence(
  userId: string,
  count: number,
  options?: { startTime?: Date; spacingSec?: number }
): CallEndEvent[] {
  const start = options?.startTime ?? new Date();
  const spacing = (options?.spacingSec ?? 1) * 1000;

  return Array.from({ length: count }, (_, i) => ({
    userId,
    endReason: "disconnect" as const,
    durationSec: SHORT_CALL_MAX_SEC,
    timestamp: new Date(start.getTime() + i * spacing),
  }));
}

/**
 * Build a sequence of calls with varying durations to test threshold logic.
 */
export function buildMixedCallSequence(
  userId: string,
  shortCount: number,
  normalCount: number,
  options?: { startTime?: Date; spacingSec?: number }
): CallEndEvent[] {
  const start = options?.startTime ?? new Date();
  const spacing = (options?.spacingSec ?? 1) * 1000;

  const shorts = Array.from({ length: shortCount }, (_, i) => ({
    userId,
    endReason: "disconnect" as const,
    durationSec: SHORT_CALL_MAX_SEC,
    timestamp: new Date(start.getTime() + i * spacing),
  }));

  const offset = shortCount * spacing;
  const normals = Array.from({ length: normalCount }, (_, i) => ({
    userId,
    endReason: "explicit" as const,
    durationSec: NORMAL_CALL_MIN_SEC,
    timestamp: new Date(start.getTime() + offset + i * spacing),
  }));

  return [...shorts, ...normals];
}

/**
 * Get a timestamp in the past for decay testing.
 */
export function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

/**
 * Get a cooldown expiration timestamp from now.
 */
export function cooldownExpiry(kind: "1h" | "24h"): Date {
  const ms = kind === "1h" ? COOLDOWN_1H_MS : COOLDOWN_24H_MS;
  return new Date(Date.now() + ms);
}

/**
 * A strike expiry date (30+ days ago) for testing decay.
 */
export function expiredStrikeDate(): Date {
  return new Date(Date.now() - STRIKE_DECAY_MS - 86_400_000); // 31 days ago
}
