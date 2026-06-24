import { db } from "@community/db";
import { callRecord } from "@community/db/schema/call";
import {
  callRoom,
  partnerReport,
  strikeEvent,
  userProfile,
} from "@community/db/schema/rebuild";
import { and, eq, sql } from "drizzle-orm";
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
          flaggedForReview: userProfile.flaggedForReview,
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

      // Read flaggedForReview from persisted DB profile (set when a partner reports this user)
      const flaggedForReview = profile?.flaggedForReview === 1;

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
      } catch {
        // Non-critical: partner notification is best-effort
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

  /**
   * Report a partner after a call ends.
   *
   * Sets the flaggedForReview flag on the partner's profile so that moderators
   * can review the call. Also records a strike if the reason indicates abuse
   * (manual strike not auto-decayed; tied to the report).
   */
  reportPartner: protectedProcedure
    .input(
      z.object({
        roomName: z.string().min(1).max(100),
        reason: z.enum([
          "non_participation",
          "abuse",
          "technical_failure",
          "other",
        ]),
        details: z.string().max(500).optional(),
      })
    )
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;

      // ── Find the room ──────────────────────────────────────────
      const rooms = await db
        .select()
        .from(callRoom)
        .where(
          and(
            eq(callRoom.roomName, input.roomName),
            eq(callRoom.status, "ended")
          )
        )
        .limit(1);

      const room = rooms[0];
      if (!room) {
        throw new Error("NOT_FOUND: No ended room found with that name");
      }

      // ── 60-second report window ─────────────────────────────
      if (room.endedAt && Date.now() - room.endedAt.getTime() > 60_000) {
        throw new Error(
          "REPORT_WINDOW_CLOSED: The 60-second report window has passed"
        );
      }

      // ── Verify participant ────────────────────────────────────
      const partnerId =
        room.participantA === userId ? room.participantB : room.participantA;

      if (!partnerId) {
        throw new Error("BAD_STATE: No partner in this room");
      }

      // ── Check for existing report (one report per room per user) ──
      const existing = await db
        .select({ id: partnerReport.id })
        .from(partnerReport)
        .where(
          and(
            eq(partnerReport.reporterId, userId),
            eq(partnerReport.callRoomId, room.id)
          )
        )
        .limit(1)
        .then((r) => r[0] ?? null);

      if (existing) {
        return { success: false, alreadyReported: true };
      }

      // ── Insert the report ─────────────────────────────────────
      const reportId = crypto.randomUUID();
      await db.insert(partnerReport).values({
        id: reportId,
        reporterId: userId,
        partnerId,
        callRoomId: room.id,
        reason: input.reason,
        details: input.details ?? null,
      });

      // ── Void the reporter's strike for this call ──────────────
      // If the reporter had a short-disconnect strike for this room,
      // void it — the report serves as the appeal.
      const pendingStrike = await db
        .select({ id: strikeEvent.id })
        .from(strikeEvent)
        .where(
          and(
            eq(strikeEvent.userId, userId),
            eq(strikeEvent.callRoomId, room.id),
            eq(strikeEvent.triggerType, "short_disconnect"),
            sql`voided_at IS NULL`
          )
        )
        .limit(1)
        .then((r) => r[0] ?? null);

      if (pendingStrike) {
        await db
          .update(strikeEvent)
          .set({
            voidedAt: new Date(),
            voidedReason: "partner_reported",
            reportId,
          })
          .where(eq(strikeEvent.id, pendingStrike.id));
      }

      // ── Flag the partner's profile for review ─────────────────
      await db
        .update(userProfile)
        .set({ flaggedForReview: 1, updatedAt: new Date() })
        .where(eq(userProfile.userId, partnerId));

      // ── If abuse, record a report-linked strike ───────────────
      if (input.reason === "abuse") {
        await db.insert(strikeEvent).values({
          userId: partnerId,
          triggerType: "reported",
          callDuration: room.duration ?? 0,
          callRoomId: room.id,
        });
      }

      return {
        success: true,
        alreadyReported: false,
        strikeVoided: pendingStrike !== null,
      };
    }),

  /**
   * Get the current user's recent ended rooms for reporting.
   *
   * Returns rooms that ended within the last 60 seconds so the user can
   * submit a report. Used by web clients that don't have the room name
   * available through navigation state.
   */
  getUserEndedRooms: protectedProcedure
    .input(z.void())
    .handler(async ({ context }) => {
      const userId = context.session.user.id;

      const rooms = await db
        .select({
          id: callRoom.id,
          roomName: callRoom.roomName,
          matchId: callRoom.matchId,
          endedAt: callRoom.endedAt,
        })
        .from(callRoom)
        .where(
          and(
            eq(callRoom.status, "ended"),
            sql`(${callRoom.participantA} = ${userId} OR ${callRoom.participantB} = ${userId})`,
            sql`ended_at IS NOT NULL`,
            sql`ended_at > NOW() - INTERVAL '65 seconds'`
          )
        )
        .orderBy(sql`ended_at DESC`)
        .limit(5);

      return { rooms };
    }),
};
