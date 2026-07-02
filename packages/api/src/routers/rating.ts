import { db } from "@community/db";
import { callRating, callRoom } from "@community/db/schema/rebuild";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure } from "../index";

// ─── Router ────────────────────────────────────────────────────────────

export const ratingRouter = {
  /**
   * Rate a partner after a call ends.
   *
   * Stores the rating with userId, partnerId, callId, stars, comment, and
   * whether the partner helped practice. One rating per user per room.
   */
  ratePartner: protectedProcedure
    .input(
      z.object({
        roomName: z.string().min(1).max(100),
        stars: z.number().int().min(1).max(5),
        helpedPractice: z.boolean(),
        comment: z.string().max(500).optional(),
      })
    )
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;

      // ── Find the ended room ─────────────────────────────
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

      // ── Verify participant ──────────────────────────────
      if (room.participantA !== userId && room.participantB !== userId) {
        throw new Error("FORBIDDEN: You are not a participant of this room");
      }

      const partnerId =
        room.participantA === userId ? room.participantB : room.participantA;

      if (!partnerId) {
        throw new Error("BAD_STATE: No partner in this room");
      }

      // ── Check for existing rating (one per user per room) ──
      const existing = await db
        .select({ id: callRating.id })
        .from(callRating)
        .where(
          and(eq(callRating.userId, userId), eq(callRating.callRoomId, room.id))
        )
        .limit(1)
        .then((r) => r[0] ?? null);

      if (existing) {
        return { success: false, alreadyRated: true };
      }

      // ── Insert the rating ──────────────────────────────
      await db.insert(callRating).values({
        userId,
        partnerId,
        callRoomId: room.id,
        stars: input.stars,
        helpedPractice: input.helpedPractice ? 1 : 0,
        comment: input.comment ?? null,
      });

      return { success: true, alreadyRated: false };
    }),

  /**
   * Get the current user's past ratings.
   */
  getMyRatings: protectedProcedure
    .input(z.void())
    .handler(async ({ context }) => {
      const userId = context.session.user.id;

      const ratings = await db
        .select({
          id: callRating.id,
          partnerId: callRating.partnerId,
          stars: callRating.stars,
          helpedPractice: callRating.helpedPractice,
          comment: callRating.comment,
          createdAt: callRating.createdAt,
        })
        .from(callRating)
        .where(eq(callRating.userId, userId))
        .orderBy(sql`created_at DESC`)
        .limit(50);

      return { ratings };
    }),
};
