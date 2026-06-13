import type { RouterClient } from "@orpc/server";

import { protectedProcedure, publicProcedure } from "../index";
import { livekitRouter } from "./livekit";
import { modelsRouter } from "./models";
import { rebuildRouter } from "./rebuild";
import { recommendationsRouter } from "./recommendations";
import { todoRouter } from "./todo";

export const appRouter = {
  healthCheck: publicProcedure.handler(() => "OK"),
  privateData: protectedProcedure.handler(({ context }) => ({
    message: "This is private",
    user: context.session?.user,
  })),
  todo: todoRouter,
  livekit: livekitRouter,
  models: modelsRouter,
  recommendations: recommendationsRouter,
  rebuild: rebuildRouter,
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
