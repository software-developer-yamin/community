import { env } from "@community/env/server";
import { AccessToken, RoomServiceClient } from "livekit-server-sdk";
import z from "zod";

import { adminProcedure, protectedProcedure } from "../index";

const roomClient = new RoomServiceClient(
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
        ttl: 5 * 60, // 5 minutes — short-lived tokens per LiveKit security best practices
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

  /**
   * Create a new LiveKit call room. Any authenticated user can create one.
   * Returns the room name so the caller can join immediately.
   */
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

  /**
   * Close (delete) a LiveKit room. Admin only.
   */
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

  /**
   * List all active LiveKit rooms with participant counts.
   */
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
};
