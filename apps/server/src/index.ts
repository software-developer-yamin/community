import { devToolsMiddleware } from "@ai-sdk/devtools";
import { google } from "@ai-sdk/google";
import { createContext } from "@community/api/context";
import { appRouter } from "@community/api/routers/index";
import { auth } from "@community/auth";
import { env } from "@community/env/server";
import { prometheus } from "@hono/prometheus";
import { sentry } from "@hono/sentry";
import { uaBlocker } from "@hono/ua-blocker";
import { aiBots, useAiRobotsTxt } from "@hono/ua-blocker/ai-bots";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { convertToModelMessages, streamText, wrapLanguageModel } from "ai";
import { initLogger, log } from "evlog";
import { createAILogger, createEvlogIntegration } from "evlog/ai";
import {
  type BetterAuthInstance,
  createAuthMiddleware,
} from "evlog/better-auth";
import { type EvlogVariables, evlog } from "evlog/hono";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { compress } from "hono/compress";
import { cors } from "hono/cors";
import { type RequestIdVariables, requestId } from "hono/request-id";
import { secureHeaders } from "hono/secure-headers";
import { timeout } from "hono/timeout";
import { type TimingVariables, timing } from "hono/timing";
import { rateLimiter } from "hono-rate-limiter";

initLogger({
  env: { service: "community-server" },
});

const identifyUser = createAuthMiddleware(auth as BetterAuthInstance, {
  exclude: ["/api/auth/**"],
  maskEmail: true,
});

type AppEnv = EvlogVariables & {
  Variables: RequestIdVariables & TimingVariables;
};

const app = new Hono<AppEnv>();

// ── Tier 1: Core infrastructure ──────────────────────────────────
app.use(evlog());
app.use("*", requestId());
app.use("*", timing());

// ── Tier 2: Security ─────────────────────────────────────────────
app.use("*", secureHeaders());

// Block known AI scrapers and crawlers
app.use("*", uaBlocker({ blocklist: aiBots }));

// ── Tier 3: Compression ──────────────────────────────────────────
app.use("*", compress());

// ── Tier 4: CORS ─────────────────────────────────────────────────
app.use(
  "/*",
  cors({
    origin: env.CORS_ORIGIN,
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// ── Tier 5: Prometheus metrics ───────────────────────────────────
const { printMetrics, registerMetrics } = prometheus();
app.use("*", registerMetrics);

// ── Public routes (no auth required) ─────────────────────────────
app.get("/metrics", printMetrics);
// biome-ignore lint/correctness/useHookAtTopLevel: useAiRobotsTxt is a Hono middleware, not a React hook
app.use("/robots.txt", useAiRobotsTxt());

// ── Tier 6: Auth identification ──────────────────────────────────
app.use("*", async (c, next) => {
  await identifyUser(c.get("log"), c.req.raw.headers, c.req.path);
  await next();
});

// ── Tier 7: Sentry error tracking ────────────────────────────────
if (env.SENTRY_DSN) {
  app.use("*", sentry({ dsn: env.SENTRY_DSN }));
}

// ── Tier 8: Timeout protection ───────────────────────────────────
app.use("/rpc/*", timeout(30_000));
app.use("/api-reference/*", timeout(30_000));

// ── Tier 9: Rate limiting ────────────────────────────────────────
app.use(
  "/rpc/*",
  rateLimiter({
    windowMs: 60_000,
    limit: 100,
    keyGenerator: (c) =>
      c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
      c.req.header("x-real-ip") ??
      "unknown",
    message: { error: "Too many requests. Please slow down." },
  })
);
app.use(
  "/api-reference/*",
  rateLimiter({
    windowMs: 60_000,
    limit: 100,
    keyGenerator: (c) =>
      c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
      c.req.header("x-real-ip") ??
      "unknown",
    message: { error: "Too many requests. Please slow down." },
  })
);
app.use(
  "/ai",
  rateLimiter({
    windowMs: 60_000,
    limit: 20,
    keyGenerator: (c) =>
      c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
      c.req.header("x-real-ip") ??
      "unknown",
    message: { error: "Too many requests. Please slow down." },
  })
);

// ── Tier 10: Payload limits ──────────────────────────────────────
app.use("/ai", bodyLimit({ maxSize: 1024 * 1024 }));

// ── Auth handler ─────────────────────────────────────────────────
app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

// ── API handlers ─────────────────────────────────────────────────
export const apiHandler = new OpenAPIHandler(appRouter, {
  plugins: [
    new OpenAPIReferencePlugin({
      schemaConverters: [new ZodToJsonSchemaConverter()],
    }),
  ],
  interceptors: [
    onError((error) => {
      log.error({
        action: "orpc",
        message: "OpenAPI handler error",
        error: String(error),
      });
    }),
  ],
});

export const rpcHandler = new RPCHandler(appRouter, {
  interceptors: [
    onError((error) => {
      log.error({
        action: "rpc",
        message: "RPC handler error",
        error: String(error),
      });
    }),
  ],
});

app.use("/*", async (c, next) => {
  const context = await createContext({ context: c });

  const rpcResult = await rpcHandler.handle(c.req.raw, {
    prefix: "/rpc",
    context,
  });

  if (rpcResult.matched) {
    return c.newResponse(rpcResult.response.body, rpcResult.response);
  }

  const apiResult = await apiHandler.handle(c.req.raw, {
    prefix: "/api-reference",
    context,
  });

  if (apiResult.matched) {
    return c.newResponse(apiResult.response.body, apiResult.response);
  }

  await next();
});

app.post("/ai", async (c) => {
  const body = await c.req.json();
  const uiMessages = body.messages || [];
  const ai = createAILogger(c.get("log"));
  const model = wrapLanguageModel({
    model: google("gemini-2.5-flash"),
    middleware: devToolsMiddleware(),
  });
  const result = streamText({
    model: ai.wrap(model),
    messages: await convertToModelMessages(uiMessages),
    experimental_telemetry: {
      isEnabled: true,
      integrations: [createEvlogIntegration(ai)],
    },
  });

  return result.toUIMessageStreamResponse();
});

app.get("/", (c) => c.text("OK"));

export default app;
