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
import { and, asc, desc, eq } from "drizzle-orm";
import z from "zod";
import { adminProcedure, protectedProcedure } from "../index";
import { isValidNativeLang } from "../lib/native-lang";
import { getEffectiveTier } from "../lib/tier";
import type { SubscriptionDetail } from "../types/subscription";

function formatTierLabel(tier: string): string {
  if (tier === "premium") {
    return "Premium";
  }
  if (tier === "premium_plus") {
    return "Premium Plus";
  }
  return "Free";
}

function formatDate(date: Date | null): string | null {
  if (!date) {
    return null;
  }
  return date.toISOString();
}

function formatReadableDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatSubscriptionDetail(
  subRow: typeof subscription.$inferSelect | undefined,
  userTier: string
): SubscriptionDetail {
  if (!subRow && userTier === "free") {
    return {
      id: "",
      tier: "free",
      provider: null,
      amount: null,
      currency: null,
      startedAt: null,
      endsAt: null,
      autoRenew: false,
      autoRenewDisabledAt: null,
      status: "free",
      readableLabel: "Free Plan",
      readableDescription: "You're on the Free plan.",
      nextBillingDate: null,
      paymentMethodLastFour: null,
      tierExpiresAt: null,
      isCancelled: false,
      willExpireOn: null,
    };
  }

  if (!subRow) {
    return {
      id: "",
      tier: userTier as SubscriptionDetail["tier"],
      provider: null,
      amount: null,
      currency: null,
      startedAt: null,
      endsAt: null,
      autoRenew: false,
      autoRenewDisabledAt: null,
      status: "active",
      readableLabel: `${formatTierLabel(userTier)} Plan`,
      readableDescription: "Your plan is active.",
      nextBillingDate: null,
      paymentMethodLastFour: null,
      tierExpiresAt: null,
      isCancelled: false,
      willExpireOn: null,
    };
  }

  const tierLabel = formatTierLabel(subRow.tier);
  const metadata = (subRow.metadata ?? {}) as Record<string, unknown>;
  const paymentMethodLastFour =
    (metadata.paymentMethodLastFour as string | undefined) ?? null;

  let computedStatus: SubscriptionDetail["status"];
  let description: string;
  let nextBillingDate: string | null;

  if (subRow.status === "active" && subRow.autoRenew === 1) {
    computedStatus = "active";
    description = `Your plan is active until ${formatReadableDate(subRow.endsAt)}. Auto-renew is on.`;
    nextBillingDate = formatDate(subRow.endsAt);
  } else if (subRow.status === "active" && subRow.autoRenew === 0) {
    computedStatus = "cancelled";
    description = `Your plan is paid until ${formatReadableDate(subRow.endsAt)}. After that, you'll be downgraded to Free.`;
    nextBillingDate = formatDate(subRow.endsAt);
  } else if (subRow.status === "expired") {
    computedStatus = "expired";
    description = "Your subscription has ended.";
    nextBillingDate = null;
  } else if (subRow.status === "refunded") {
    computedStatus = "refunded";
    description = "Your subscription has been refunded.";
    nextBillingDate = null;
  } else {
    computedStatus = subRow.status as SubscriptionDetail["status"];
    description = `Your subscription is ${subRow.status}.`;
    nextBillingDate = null;
  }

  const label =
    computedStatus === "active"
      ? `${tierLabel} Plan`
      : `${tierLabel} Plan (${computedStatus})`;

  return {
    id: subRow.id,
    tier: subRow.tier,
    provider: subRow.provider,
    amount: subRow.amount,
    currency: subRow.currency,
    startedAt: formatDate(subRow.startedAt),
    endsAt: formatDate(subRow.endsAt),
    autoRenew: subRow.autoRenew === 1,
    autoRenewDisabledAt: formatDate(subRow.autoRenewDisabledAt),
    status: computedStatus,
    readableLabel: label,
    readableDescription: description,
    nextBillingDate,
    paymentMethodLastFour,
    tierExpiresAt: formatDate(subRow.endsAt),
    isCancelled: subRow.autoRenew === 0,
    willExpireOn: subRow.autoRenew === 0 ? formatDate(subRow.endsAt) : null,
  };
}

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
        nativeLanguage: z
          .string()
          .refine((v) => isValidNativeLang(v), {
            message: "Invalid native language",
          })
          .optional(),
        tier: z.enum(["free", "premium", "premium_plus"]).optional(),
        phoneNumber: z.string().max(20).optional(),
      })
    )
    .handler(async ({ input, context }) => {
      if (input.genderPreference !== undefined) {
        const { effectiveTier } = await getEffectiveTier(
          context.session.user.id
        );
        if (effectiveTier !== "premium_plus") {
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
    const [profile] = await db
      .select()
      .from(userProfile)
      .where(eq(userProfile.userId, context.session.user.id))
      .limit(1);

    const [subRow] = await db
      .select()
      .from(subscription)
      .where(eq(subscription.userId, context.session.user.id))
      .limit(1);

    return formatSubscriptionDetail(
      subRow ?? undefined,
      profile?.tier ?? "free"
    );
  }),

  toggleAutoRenew: protectedProcedure.handler(async ({ context }) => {
    const [profile] = await db
      .select()
      .from(userProfile)
      .where(eq(userProfile.userId, context.session.user.id))
      .limit(1);

    if (!profile) {
      throw new Error("Profile not found");
    }

    const [subRow] = await db
      .select()
      .from(subscription)
      .where(
        and(
          eq(subscription.userId, context.session.user.id),
          eq(subscription.status, "active")
        )
      )
      .limit(1);

    if (!subRow) {
      throw new Error("No active subscription found");
    }

    const now = new Date();
    const newAutoRenew = subRow.autoRenew === 1 ? 0 : 1;

    const [updated] = await db
      .update(subscription)
      .set({
        autoRenew: newAutoRenew,
        autoRenewDisabledAt: newAutoRenew === 0 ? now : null,
        updatedAt: now,
      })
      .where(eq(subscription.id, subRow.id))
      .returning();

    if (!updated) {
      throw new Error("Failed to update subscription");
    }

    if (subRow.endsAt) {
      await db
        .update(userProfile)
        .set({ tierExpiresAt: subRow.endsAt })
        .where(eq(userProfile.userId, context.session.user.id));
    }

    return formatSubscriptionDetail(updated, profile.tier);
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

  getTicketMessages: protectedProcedure
    .input(z.object({ ticketId: z.string().uuid() }))
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

      return db
        .select()
        .from(supportTicketMessage)
        .where(eq(supportTicketMessage.ticketId, input.ticketId))
        .orderBy(asc(supportTicketMessage.createdAt));
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
