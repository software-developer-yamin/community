import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  clientPrefix: "EXPO_PUBLIC_",
  client: {
    EXPO_PUBLIC_SERVER_URL: z.url(),
    EXPO_PUBLIC_LIVEKIT_URL: z.url(),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
