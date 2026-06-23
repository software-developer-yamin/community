import { db } from "@community/db";
import { strikeEvent, userProfile } from "@community/db/schema/rebuild";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure } from "../index";
import {
  computeActiveStrikes24h,
  STRIKE_DECAY_DAYS,
} from "../lib/strike-logic";

// ─── Helpers ───────────────────────────────────────────────────────────

/**
 * Map the DB enum value to the expanded moderation state expected by the API.
 * The DB stores a generic "cooldown" — we compute 1h vs 24h from strike count.
 */
function expandModerationState(
  activeCount: number,
  dbState: string | null
): string {
  if (dbState === "suspended") {
    return "suspended";
  }
  if (dbState === "banned") {
    return "banned";
  }
  // Compute expanded state from active strike count
  if (activeCount >= 10) {
    return "cooldown_24h";
  }
  if (activeCount >= 5) {
    return "cooldown_1h";
  }
  if (activeCount >= 3) {
    return "warned";
  }
  return "clean";
}

// ─── Router ────────────────────────────────────────────────────────────

export const moderationRouter = {
  /**
   * Get the current user's moderation state.
   *
   * Computes strike decay on read: strikes older than 30 days are excluded.
   * Returns the count of active strikes, computed state, cooldown info, and
   * whether the user is flagged for human review.
   */
  getStrikes: protectedProcedure
    .input(z.void())
    .handler(async ({ context }) => {
      const userId = context.session.user.id;

      // Fetch all non-voided strike events for this user
      const strikes = await db
        .select({
          createdAt: strikeEvent.createdAt,
          durationSec: strikeEvent.callDuration,
          voidedAt: strikeEvent.voidedAt,
        })
        .from(strikeEvent)
        .where(
          and(
            eq(strikeEvent.userId, userId),
            eq(strikeEvent.triggerType, "short_disconnect")
          )
        )
        .orderBy(strikeEvent.createdAt)
        .limit(200);

      const now = new Date();

      // Apply decay: strikes older than 30 days are excluded
      const cutoff = new Date(
        now.getTime() - STRIKE_DECAY_DAYS * 24 * 60 * 60 * 1000
      );
      const nonVoidedStrikes = strikes.filter(
        (s) => s.voidedAt === null && s.createdAt >= cutoff
      );

      // Count active strikes within 24h for cooldown state
      const active24h = computeActiveStrikes24h(nonVoidedStrikes, now);

      // Get the persisted profile state
      const profile = await db
        .select({
          moderationState: userProfile.moderationState,
          cooldownUntil: userProfile.cooldownUntil,
          strikeCount: userProfile.strikeCount,
        })
        .from(userProfile)
        .where(eq(userProfile.userId, userId))
        .limit(1)
        .then((r) => r[0] ?? null);

      // Compute state from active 24h strikes for cooldown thresholds
      const state = expandModerationState(
        active24h,
        profile?.moderationState ?? null
      );

      // Cooldown: use the persisted cooldownUntil if still active
      const cooldownUntil =
        profile?.cooldownUntil && profile.cooldownUntil > now
          ? profile.cooldownUntil.toISOString()
          : null;

      const flaggedForReview = active24h >= 10;

      return {
        strikeCount: nonVoidedStrikes.length,
        state,
        cooldownUntil,
        flaggedForReview,
      };
    }),
};
