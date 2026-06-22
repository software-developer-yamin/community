import { db } from "@community/db";
import {
  callRating,
  callRoom,
  crashEvent,
  partnerReport,
  refundRequest,
  strikeEvent,
  subscription,
  supportTicket,
  supportTicketMessage,
  userProfile,
} from "@community/db/schema/rebuild";
import { and, desc, eq } from "drizzle-orm";
import z from "zod";

import { adminProcedure, protectedProcedure } from "../index";

export const rebuildRouter = {
  getProfile: protectedProcedure.handler(async ({ context }) => {
    const rows = await db
      .select()
      .from(userProfile)
      .where(eq(userProfile.userId, context.session.user.id))
      .limit(1);
    return rows[0] ?? null;
  }),

  updateProfile: protectedProcedure
    .input(
      z.object({
        displayName: z.string().min(2).max(30).optional(),
        gender: z
          .enum(["male", "female", "nonbinary", "undisclosed"])
          .optional(),
        genderPreference: z
          .enum(["male", "female", "nonbinary", "undisclosed"])
          .optional(),
        nativeLanguage: z.string().max(30).optional(),
        tier: z.enum(["free", "premium", "premium_plus"]).optional(),
        phoneNumber: z.string().max(20).optional(),
      })
    )
    .handler(async ({ input, context }) => {
      if (input.genderPreference !== undefined) {
        const profile = await db
          .select({ tier: userProfile.tier })
          .from(userProfile)
          .where(eq(userProfile.userId, context.session.user.id))
          .limit(1);
        if (profile[0]?.tier !== "premium_plus") {
          throw new Error("Gender preference requires premium_plus tier");
        }
      }

      await db
        .insert(userProfile)
        .values({
          userId: context.session.user.id,
          ...input,
        })
        .onConflictDoUpdate({
          target: userProfile.userId,
          set: input,
        });
      return { ok: true };
    }),

  createCallRoom: protectedProcedure
    .input(
      z.object({
        matchId: z.string().min(1).max(100),
        roomName: z.string().min(1).max(100),
        participantA: z.string().uuid(),
        participantB: z.string().uuid(),
      })
    )
    .handler(async ({ input }) => {
      const [room] = await db
        .insert(callRoom)
        .values({
          matchId: input.matchId,
          roomName: input.roomName,
          participantA: input.participantA,
          participantB: input.participantB,
        })
        .returning();
      if (!room) {
        throw new Error("Failed to create room");
      }
      return { roomId: room.id };
    }),

  joinCallRoom: protectedProcedure
    .input(z.object({ roomId: z.string().uuid() }))
    .handler(async ({ input }) => {
      const rows = await db
        .select()
        .from(callRoom)
        .where(eq(callRoom.id, input.roomId))
        .limit(1);
      const room = rows[0];
      if (!room) {
        throw new Error("Room not found");
      }
      if (room.status === "ended") {
        throw new Error("Room has ended");
      }

      return { roomId: room.id, status: room.status };
    }),

  endCallRoom: protectedProcedure
    .input(
      z.object({
        roomId: z.string().uuid(),
        endReason: z.enum([
          "user_ended",
          "partner_ended",
          "connection_lost",
          "skip",
          "timeout",
          "system_error",
        ]),
      })
    )
    .handler(async ({ input, context }) => {
      const rows = await db
        .select()
        .from(callRoom)
        .where(eq(callRoom.id, input.roomId))
        .limit(1);
      if (rows.length === 0) {
        throw new Error("Room not found");
      }

      await db
        .update(callRoom)
        .set({
          status: "ended",
          endedAt: new Date(),
          endReason: input.endReason,
          endedBy: context.session.user.id,
        })
        .where(eq(callRoom.id, input.roomId));

      return { ok: true };
    }),

  getRoomStatus: protectedProcedure
    .input(z.object({ roomId: z.string().uuid() }))
    .handler(async ({ input }) => {
      const rows = await db
        .select()
        .from(callRoom)
        .where(eq(callRoom.id, input.roomId))
        .limit(1);
      if (rows.length === 0) {
        throw new Error("Room not found");
      }
      return rows[0];
    }),

  reportPartner: protectedProcedure
    .input(
      z.object({
        callRoomId: z.string().uuid(),
        partnerId: z.string().uuid(),
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
      await db.insert(partnerReport).values({
        reporterId: context.session.user.id,
        partnerId: input.partnerId,
        callRoomId: input.callRoomId,
        reason: input.reason,
        details: input.details,
      });

      await db
        .insert(strikeEvent)
        .values({
          userId: input.partnerId,
          callRoomId: input.callRoomId,
          triggerType: input.reason,
        })
        .onConflictDoNothing();

      const strikes = await db
        .select()
        .from(strikeEvent)
        .where(eq(strikeEvent.userId, input.partnerId));
      const totalStrikes = strikes.length;

      // Graduated moderation response:
      //   1 strike  → warned
      //   2 strikes → cooldown (24h mute)
      //   3 strikes → suspended (admin review required)
      //   4+ strikes → banned
      if (totalStrikes >= 4) {
        await db
          .update(userProfile)
          .set({ moderationState: "banned" })
          .where(eq(userProfile.userId, input.partnerId));
      } else if (totalStrikes === 3) {
        await db
          .update(userProfile)
          .set({ moderationState: "suspended" })
          .where(eq(userProfile.userId, input.partnerId));
      } else if (totalStrikes === 2) {
        await db
          .update(userProfile)
          .set({
            moderationState: "cooldown",
            cooldownUntil: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
          })
          .where(eq(userProfile.userId, input.partnerId));
      } else if (totalStrikes === 1) {
        await db
          .update(userProfile)
          .set({ moderationState: "warned" })
          .where(eq(userProfile.userId, input.partnerId));
      }

      return { ok: true, strikesIssued: totalStrikes };
    }),

  getModerationState: protectedProcedure.handler(async ({ context }) => {
    const rows = await db
      .select()
      .from(userProfile)
      .where(eq(userProfile.userId, context.session.user.id))
      .limit(1);
    return rows[0]?.moderationState ?? "clean";
  }),

  getMyStrikes: protectedProcedure.handler(async ({ context }) =>
    db
      .select()
      .from(strikeEvent)
      .where(eq(strikeEvent.userId, context.session.user.id))
      .orderBy(desc(strikeEvent.createdAt))
  ),

  getSubscription: protectedProcedure.handler(async ({ context }) => {
    const rows = await db
      .select()
      .from(subscription)
      .where(eq(subscription.userId, context.session.user.id))
      .limit(1);
    return rows[0] ?? null;
  }),

  createSupportTicket: protectedProcedure
    .input(
      z.object({
        subject: z.string().min(1).max(100),
        description: z.string().min(1).max(2000),
        category: z.enum(["billing", "technical", "moderation", "other"]),
      })
    )
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;
      const profile = await db
        .select()
        .from(userProfile)
        .where(eq(userProfile.userId, userId))
        .limit(1);
      const tier = profile[0]?.tier ?? "free";

      const ticketNumber = `TKT-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(
        Math.random() * 1000
      )
        .toString()
        .padStart(3, "0")}`;
      const slaDeadline = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const [ticket] = await db
        .insert(supportTicket)
        .values({
          userId,
          ticketNumber,
          subject: input.subject,
          description: input.description,
          category: input.category,
          userTier: tier,
          slaDeadline,
        })
        .returning();
      if (!ticket) {
        throw new Error("Failed to create ticket");
      }
      return { ticketId: ticket.id };
    }),

  getMyTickets: protectedProcedure.handler(async ({ context }) =>
    db
      .select()
      .from(supportTicket)
      .where(eq(supportTicket.userId, context.session.user.id))
      .orderBy(desc(supportTicket.createdAt))
  ),

  addTicketMessage: protectedProcedure
    .input(
      z.object({
        ticketId: z.string().uuid(),
        body: z.string().min(1).max(2000),
      })
    )
    .handler(async ({ input, context }) => {
      const ticket = await db
        .select()
        .from(supportTicket)
        .where(
          and(
            eq(supportTicket.id, input.ticketId),
            eq(supportTicket.userId, context.session.user.id)
          )
        )
        .limit(1);
      if (ticket.length === 0) {
        throw new Error("Ticket not found");
      }

      await db.insert(supportTicketMessage).values({
        ticketId: input.ticketId,
        senderId: context.session.user.id,
        senderRole: "user",
        body: input.body,
      });

      return { ok: true };
    }),

  listTickets: adminProcedure.handler(async () =>
    db
      .select()
      .from(supportTicket)
      .orderBy(desc(supportTicket.createdAt))
      .limit(100)
  ),

  updateTicketStatus: adminProcedure
    .input(
      z.object({
        ticketId: z.string().uuid(),
        status: z.enum(["open", "pending", "resolved", "closed"]),
      })
    )
    .handler(async ({ input }) => {
      await db
        .update(supportTicket)
        .set({
          status: input.status,
          resolvedAt: input.status === "resolved" ? new Date() : undefined,
        })
        .where(eq(supportTicket.id, input.ticketId));
      return { ok: true };
    }),

  listBannedUsers: adminProcedure.handler(async () =>
    db
      .select()
      .from(userProfile)
      .where(eq(userProfile.moderationState, "banned"))
      .limit(100)
  ),

  unbanUser: adminProcedure
    .input(z.object({ userId: z.string().uuid() }))
    .handler(async ({ input }) => {
      await db
        .update(userProfile)
        .set({ moderationState: "clean" })
        .where(eq(userProfile.userId, input.userId));
      return { ok: true };
    }),

  skipCall: protectedProcedure
    .input(
      z.object({
        callRoomId: z.string().uuid(),
        partnerId: z.string().uuid(),
        reason: z.enum([
          "non_participation",
          "abuse",
          "technical_failure",
          "other",
        ]),
      })
    )
    .handler(async ({ input, context }) => {
      await db.insert(partnerReport).values({
        reporterId: context.session.user.id,
        partnerId: input.partnerId,
        callRoomId: input.callRoomId,
        reason: input.reason,
      });

      return { ok: true };
    }),

  reportCrash: protectedProcedure
    .input(
      z.object({
        type: z.enum(["force_close", "anr", "black_screen"]),
        appVersion: z.string().max(50).optional(),
        osVersion: z.string().max(50).optional(),
        deviceModel: z.string().max(100).optional(),
        stackTrace: z.string().max(2000).optional(),
      })
    )
    .handler(async ({ input, context }) => {
      const [crash] = await db
        .insert(crashEvent)
        .values({
          userId: context.session.user.id,
          type: input.type,
          appVersion: input.appVersion,
          osVersion: input.osVersion,
          deviceModel: input.deviceModel,
          stackTrace: input.stackTrace,
        })
        .returning();
      if (!crash) {
        throw new Error("Failed to log crash");
      }
      return { crashId: crash.id };
    }),

  reconnectToRoom: protectedProcedure
    .input(z.object({ roomId: z.string().uuid() }))
    .handler(async ({ input }) => {
      const rows = await db
        .select()
        .from(callRoom)
        .where(eq(callRoom.id, input.roomId))
        .limit(1);
      const room = rows[0];
      if (!room) {
        throw new Error("Room not found");
      }
      if (room.status === "ended") {
        throw new Error("Room has ended");
      }

      return {
        roomId: room.id,
        status: room.status,
        canReconnect: true,
      };
    }),

  rateCall: protectedProcedure
    .input(
      z.object({
        callRoomId: z.string().uuid(),
        partnerId: z.string().uuid(),
        stars: z.number().int().min(1).max(5),
        helpedPractice: z.number().int().min(0).max(1).optional(),
        comment: z.string().max(500).optional(),
      })
    )
    .handler(async ({ input, context }) => {
      await db.insert(callRating).values({
        userId: context.session.user.id,
        partnerId: input.partnerId,
        callRoomId: input.callRoomId,
        stars: input.stars,
        helpedPractice: input.helpedPractice,
        comment: input.comment,
      });
      return { ok: true };
    }),

  createRefundRequest: protectedProcedure
    .input(
      z.object({
        subscriptionId: z.string().uuid(),
        reason: z.string().min(1).max(500),
      })
    )
    .handler(async ({ input, context }) => {
      const [refund] = await db
        .insert(refundRequest)
        .values({
          userId: context.session.user.id,
          subscriptionId: input.subscriptionId,
          path: "human_review",
          status: "pending",
          slaDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        })
        .returning();
      if (!refund) {
        throw new Error("Failed to create refund request");
      }
      return { refundId: refund.id };
    }),

  getMyRefundRequests: protectedProcedure.handler(async ({ context }) =>
    db
      .select()
      .from(refundRequest)
      .where(eq(refundRequest.userId, context.session.user.id))
      .orderBy(desc(refundRequest.createdAt))
  ),
};
