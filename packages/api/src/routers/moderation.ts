import { db } from "@community/db";
import { callRecord } from "@community/db/schema/call";
import {
  callRoom,
  strikeEvent,
  userProfile,
} from "@community/db/schema/rebuild";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure } from "../index";
import { recordSkip } from "../lib/skip-tracker";
import {
  computeActiveStrikes24h,
  STRIKE_DECAY_DAYS,
} from "../lib/strike-logic";
import { roomClient } from "./livekit";

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

  /**
   * Skip the current call.
   *
   * Rate-limited (max 1 skip per 5s per user). After 3 skips in a session a
   * `showNudge` flag is returned so the client can show a gentle reminder.
   * The partner is notified via LiveKit participant metadata with
   * `callEndReason: "partner_skipped"`.
   *
   * Does NOT create a strike — skipping is allowed but monitored.
   */
  skipCall: protectedProcedure
    .input(z.object({ roomName: z.string().min(1).max(100) }))
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;

      // ── Find the active room ──────────────────────────────────
      const rooms = await db
        .select()
        .from(callRoom)
        .where(
          and(
            eq(callRoom.roomName, input.roomName),
            eq(callRoom.status, "active")
          )
        )
        .limit(1);

      const room = rooms[0];
      if (!room) {
        throw new Error("NOT_FOUND: No active room found with that name");
      }

      // ── Verify participant ────────────────────────────────────
      if (room.participantA !== userId && room.participantB !== userId) {
        throw new Error("FORBIDDEN: You are not a participant of this room");
      }

      // ── Rate-limit check ──────────────────────────────────────
      const skipResult = recordSkip(userId);
      if (skipResult.isRateLimited) {
        return {
          success: false,
          isRateLimited: true,
          showNudge: false,
          count: skipResult.count,
        };
      }

      // ── Notify partner via LiveKit metadata ───────────────────
      try {
        const participants = await roomClient.listParticipants(input.roomName);
        const partnerIdentity = participants.find(
          (p) =>
            p.identity !== context.session.user.name &&
            p.identity !== context.session.user.email
        );
        if (partnerIdentity) {
          await roomClient.updateParticipant(
            input.roomName,
            partnerIdentity.identity,
            JSON.stringify({ callEndReason: "partner_skipped" })
          );
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      } catch (err) {
        console.warn("Failed to notify partner of skip:", err);
      }

      // ── Delete the LiveKit room ──────────────────────────────
      await roomClient.deleteRoom(input.roomName).catch(() => {
        // Room already deleted or doesn't exist — nothing to clean up
      });

      // ── Record in DB ─────────────────────────────────────────
      const durationSec = room.createdAt
        ? Math.floor((Date.now() - room.createdAt.getTime()) / 1000)
        : undefined;

      await db
        .update(callRoom)
        .set({
          status: "ended",
          endReason: "skip",
          endedBy: userId,
          duration: durationSec,
          endedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(callRoom.id, room.id));

      await db.insert(callRecord).values({
        roomName: input.roomName,
        matchId: room.matchId,
        endedByUserId: userId,
        endReason: "skip",
        participantCount: 2,
        durationSec,
      });

      return {
        success: true,
        isRateLimited: false,
        showNudge: skipResult.showNudge,
        count: skipResult.count,
      };
    }),
};
