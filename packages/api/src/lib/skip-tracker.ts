/**
 * In-memory session-level skip tracker.
 *
 * Tracks how many times a user has skipped calls in a single session.
 * No persistence — counts reset when a new call begins.
 *
 * Rate limit: 1 skip per 5 seconds (server-enforced).
 * UX nudge: shown after 3 skips in a session.
 */

// ─── Constants ──────────────────────────────────────────────────────────

export const SKIP_RATE_LIMIT_MS = 5000;
export const SKIP_NUDGE_THRESHOLD = 3;

// ─── Types ──────────────────────────────────────────────────────────────

export interface SkipSession {
  count: number;
  lastSkipAt: number;
  timestamps: number[];
}

export interface RecordSkipResult {
  count: number;
  isRateLimited: boolean;
  showNudge: boolean;
}

// ─── Store ──────────────────────────────────────────────────────────────

const sessions = new Map<string, SkipSession>();

// ─── Public API ─────────────────────────────────────────────────────────

/**
 * Record a skip action for a user and return the updated state.
 *
 * - Returns `isRateLimited: true` if the last skip was within 5 seconds.
 * - Returns `showNudge: true` when count >= 3 after recording.
 */
export function recordSkip(userId: string): RecordSkipResult {
  const now = Date.now();
  let session = sessions.get(userId);

  if (!session) {
    session = { count: 0, lastSkipAt: 0, timestamps: [] };
    sessions.set(userId, session);
  }

  // Rate-limit check
  if (now - session.lastSkipAt < SKIP_RATE_LIMIT_MS) {
    return {
      count: session.count,
      isRateLimited: true,
      showNudge: false,
    };
  }

  // Record the skip
  session.count += 1;
  session.lastSkipAt = now;
  session.timestamps.push(now);

  return {
    count: session.count,
    isRateLimited: false,
    showNudge: session.count >= SKIP_NUDGE_THRESHOLD,
  };
}

/**
 * Reset skip count for a user's new session (called when a new call begins).
 */
export function resetSkipCount(userId: string): void {
  sessions.delete(userId);
}

/**
 * Get the current skip count for a user (without recording).
 */
export function getSkipCount(userId: string): number {
  return sessions.get(userId)?.count ?? 0;
}

/**
 * Clear all sessions (used in tests).
 */
export function clearAllSessions(): void {
  sessions.clear();
}
