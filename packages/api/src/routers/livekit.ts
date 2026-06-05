import { env } from "@community/env/server";
import { AccessToken } from "livekit-server-sdk";
import z from "zod";

import { protectedProcedure } from "../index";

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
        ttl: 60 * 60, // 1 hour
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
};
