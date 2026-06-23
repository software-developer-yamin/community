import { db } from "@community/db";
import { callRecord } from "@community/db/schema/call";
import {
  callRoom,
  strikeEvent,
  userProfile,
} from "@community/db/schema/rebuild";
import { env } from "@community/env/server";
import { and, eq, sql } from "drizzle-orm";
import { AccessToken, RoomServiceClient } from "livekit-server-sdk";
import z from "zod";

import { adminProcedure, protectedProcedure } from "../index";
import { computeDecayedState, shouldCountAsStrike } from "../lib/strike-logic";
import {
  IncrementReconnectionCountInput,
  RefreshTokenInput,
  UpdateParticipantStatusInput,
} from "../validators/livekit";

export const roomClient = new RoomServiceClient(
  env.LIVEKIT_URL,
  env.LIVEKIT_API_KEY,
  env.LIVEKIT_API_SECRET
);

export const livekitRouter = {
  token: protectedProcedure
    .input(
      z.object({
        room: z.string().min(1).max(100),
        username: z.string().min(1).max(100),
      })
    )
    .handler(async ({ input }) => {
      const at = new AccessToken(env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET, {
        identity: input.username,
        ttl: 5 * 60,
      });

      at.addGrant({
        roomJoin: true,
        room: input.room,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
      });

      return {
        token: await at.toJwt(),
      };
    }),

  createRoom: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        maxParticipants: z.number().int().min(2).max(50).default(6),
        metadata: z.string().optional(),
      })
    )
    .handler(async ({ input }) => {
      const room = await roomClient.createRoom({
        name: input.name,
        maxParticipants: input.maxParticipants,
        metadata: input.metadata,
      });

      return { name: room.name };
    }),

  closeRoom: adminProcedure
    .input(
      z.object({
        room: z.string().min(1).max(100),
      })
    )
    .handler(async ({ input }) => {
      await roomClient.deleteRoom(input.room);

      return { success: true };
    }),

  listRooms: protectedProcedure.input(z.void()).handler(async () => {
    const rooms = await roomClient.listRooms();

    return rooms.map((room) => ({
      name: room.name,
      participantCount: room.numParticipants,
      maxParticipants: room.maxParticipants,
      metadata: room.metadata,
      createdAt: Number(room.creationTime),
    }));
  }),

  createCallRoom: protectedProcedure
    .input(
      z.object({
        matchId: z.string().min(1).max(100),
        participantAId: z.string().min(1),
        participantAName: z.string().min(1).max(100),
        participantBId: z.string().min(1),
        participantBName: z.string().min(1).max(100),
      })
    )
    .handler(async ({ input, context }) => {
      const callerId = context.session.user.id;

      if (
        callerId !== input.participantAId &&
        callerId !== input.participantBId
      ) {
        throw new Error("FORBIDDEN: You are not a participant of this match");
      }

      const roomName = `call-${input.matchId}`;

      const existing = await db
        .select({ id: callRoom.id })
        .from(callRoom)
        .where(
          and(
            eq(callRoom.matchId, input.matchId),
            eq(callRoom.status, "active")
          )
        )
        .limit(1);

      if (existing.length > 0) {
        throw new Error(
          `CONFLICT: Room already exists for match ${input.matchId}`
        );
      }

      const liveRooms = await roomClient.listRooms([roomName]);
      if (liveRooms.length > 0) {
        throw new Error(`CONFLICT: Room ${roomName} already exists in LiveKit`);
      }

      await roomClient.createRoom({
        name: roomName,
        maxParticipants: 2,
        emptyTimeout: 30,
        metadata: JSON.stringify({
          matchId: input.matchId,
          participantAId: input.participantAId,
          participantBId: input.participantBId,
        }),
      });

      await db.insert(callRoom).values({
        matchId: input.matchId,
        roomName,
        participantA: input.participantAId,
        participantB: input.participantBId,
        status: "active",
      });

      const tokenA = new AccessToken(
        env.LIVEKIT_API_KEY,
        env.LIVEKIT_API_SECRET,
        {
          identity: input.participantAName,
          ttl: 5 * 60,
        }
      );
      tokenA.addGrant({
        roomJoin: true,
        room: roomName,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
      });

      const tokenB = new AccessToken(
        env.LIVEKIT_API_KEY,
        env.LIVEKIT_API_SECRET,
        {
          identity: input.participantBName,
          ttl: 5 * 60,
        }
      );
      tokenB.addGrant({
        roomJoin: true,
        room: roomName,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
      });

      return {
        roomName,
        tokenA: await tokenA.toJwt(),
        tokenB: await tokenB.toJwt(),
      };
    }),

  endCall: protectedProcedure
    .input(
      z.object({
        roomName: z.string().min(1).max(100),
        endReason: z
          .enum([
            "explicit",
            "disconnect",
            "timeout",
            "connection_lost",
            "partner_ended",
          ])
          .default("explicit"),
      })
    )
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;

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

      if (input.endReason === "explicit") {
        try {
          const participants = await roomClient.listParticipants(
            input.roomName
          );
          const partner = participants.find(
            (p) =>
              p.identity !== context.session.user.name &&
              p.identity !== context.session.user.email
          );
          if (partner) {
            await roomClient.updateParticipant(
              input.roomName,
              partner.identity,
              JSON.stringify({
                callEndReason: "partner_ended",
              })
            );
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        } catch (err) {
          console.warn("Failed to notify partner of end reason:", err);
        }
      }

      await roomClient.deleteRoom(input.roomName).catch(() => {
        // Room already deleted or doesn't exist — nothing to clean up
      });

      const durationSec = room.createdAt
        ? Math.floor((Date.now() - room.createdAt.getTime()) / 1000)
        : undefined;

      await db
        .update(callRoom)
        .set({ status: "ended", updatedAt: new Date() })
        .where(eq(callRoom.id, room.id));

      await db.insert(callRecord).values({
        roomName: input.roomName,
        matchId: room.matchId,
        endedByUserId: userId,
        endReason: input.endReason,
        participantCount: 2,
        durationSec,
      });

      // ── Strike recording ────────────────────────────────────
      if (
        durationSec !== undefined &&
        shouldCountAsStrike(input.endReason, durationSec)
      ) {
        const now = new Date();

        await db.insert(strikeEvent).values({
          userId,
          callRoomId: room.id,
          triggerType: "short_disconnect",
          callDuration: durationSec,
          createdAt: now,
        });

        // Compute new strike count and state
        const existingProfile = await db
          .select({ strikeCount: userProfile.strikeCount })
          .from(userProfile)
          .where(eq(userProfile.userId, userId))
          .limit(1)
          .then((r) => r[0] ?? null);

        const newStrikeCount = (existingProfile?.strikeCount ?? 0) + 1;
        const { result } = computeDecayedState(
          [{ createdAt: now, durationSec, voidedAt: null }],
          now
        );

        const dbState =
          result.state === "cooldown_1h" || result.state === "cooldown_24h"
            ? "cooldown"
            : result.state;

        await db
          .insert(userProfile)
          .values({
            userId,
            strikeCount: newStrikeCount,
            lastStrikeAt: now,
            moderationState: dbState as
              | "clean"
              | "warned"
              | "cooldown"
              | "suspended"
              | "banned",
            cooldownUntil: result.cooldownUntil,
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: userProfile.userId,
            set: {
              strikeCount: newStrikeCount,
              lastStrikeAt: now,
              moderationState: dbState as
                | "clean"
                | "warned"
                | "cooldown"
                | "suspended"
                | "banned",
              cooldownUntil: result.cooldownUntil,
              updatedAt: now,
            },
          });
      }

      return { success: true };
    }),

  refreshToken: protectedProcedure
    .input(RefreshTokenInput)
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;
      const username =
        context.session.user.name ?? context.session.user.email ?? "guest";

      // Verify user is a participant of this room
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

      if (room.participantA !== userId && room.participantB !== userId) {
        throw new Error("FORBIDDEN: You are not a participant of this room");
      }

      const at = new AccessToken(env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET, {
        identity: username,
        ttl: 5 * 60,
      });

      at.addGrant({
        roomJoin: true,
        room: input.roomName,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
      });

      return {
        token: await at.toJwt(),
      };
    }),

  updateParticipantStatus: protectedProcedure
    .input(UpdateParticipantStatusInput)
    .handler(async ({ input, context }) => {
      // LiveKit participant identity is the username (name/email),
      // not the DB user id — match how the token procedure creates identities
      const identity =
        context.session.user.name ?? context.session.user.email ?? "guest";

      // Update participant metadata on the LiveKit room
      await roomClient.updateParticipant(
        input.roomName,
        identity,
        JSON.stringify({
          reconnectStatus: input.status,
        })
      );

      return { success: true };
    }),

  incrementReconnectionCount: protectedProcedure
    .input(IncrementReconnectionCountInput)
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;

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

      if (room.participantA !== userId && room.participantB !== userId) {
        throw new Error("FORBIDDEN: You are not a participant of this room");
      }

      await db
        .update(callRoom)
        .set({
          reconnectCount: sql`reconnect_count + 1`,
          lastReconnectAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(callRoom.id, room.id));

      return { success: true };
    }),
};
