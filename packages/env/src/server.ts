import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.url(),
    CORS_ORIGIN: z.url(),
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    // SMS provider — used for phone OTP verification
    SMS_PROVIDER: z.enum(["console", "http"]).default("console"),
    SMS_API_KEY: z.string().optional(),
    SMS_SENDER_ID: z.string().optional(),
    SMS_API_URL: z.string().url().optional(),
    // LiveKit — required for token minting
    LIVEKIT_API_KEY: z.string().min(1),
    LIVEKIT_API_SECRET: z.string().min(1),
    // LiveKit server URL used by the server SDK (HTTP(S) form, not wss://).
    // The server SDK will automatically convert wss -> https when calling.
    LIVEKIT_URL: z.string().min(1),
    // LiveKit webhook secret for verifying webhook signatures.
    LIVEKIT_WEBHOOK_SECRET: z.string().min(1),
    MODEL_STACK_VERSION: z.string().optional(),
    LLAMA_URL: z.string().url().optional(),
    EMBED_URL: z.string().url().optional(),
    PRON_URL: z.string().url().optional(),
    SENTRY_DSN: z.string().url().optional(),
    // ── Payment providers (@foxses/pay) ───────────────────────────
    // SSLCommerz (Bangladesh)
    SSLCOMMERZ_STORE_ID: z.string().optional(),
    SSLCOMMERZ_STORE_PASS: z.string().optional(),
    SSLCOMMERZ_SANDBOX: z.coerce.boolean().default(true),
    // bKash (Bangladesh)
    BKASH_APP_KEY: z.string().optional(),
    BKASH_APP_SECRET: z.string().optional(),
    BKASH_USERNAME: z.string().optional(),
    BKASH_PASSWORD: z.string().optional(),
    BKASH_SANDBOX: z.coerce.boolean().default(true),
    // Stripe (Global)
    STRIPE_SECRET_KEY: z.string().optional(),
    STRIPE_WEBHOOK_SECRET: z.string().optional(),
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
  },
  clientPrefix: "EXPO_PUBLIC_",
  client: {
    // Public, native/web clients use this to mint tokens via oRPC.
    EXPO_PUBLIC_LIVEKIT_URL: z.url().optional(),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
