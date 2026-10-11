# 0004. One oRPC router in `packages/api`, mounted on Hono at two prefixes

**Status:** Accepted
**Date:** 2026-10-11
**Evidence:** packages/api/src/routers/index.ts, packages/api/src/index.ts, apps/server/src/index.ts, apps/web/src/utils/orpc.ts, apps/native/utils/orpc.ts, packages/api/src/context.ts

## Context

The native app, the web admin, and the server all need the same request shapes, and the
schema must be defined once rather than restated per client. But the runtime is not a plain
RPC server: `apps/server/src/index.ts` mounts a ten-tier middleware stack (evlog, request-id,
secure headers, an AI-bot UA blocker, CORS, Prometheus, Sentry, timeout, rate limiting, body
limits) that has nothing to do with the request contract. Separating those two concerns —
where the contract lives versus what serves it — is the decision this ADR records.

## Decision

The API contract is a single `appRouter` defined in `packages/api/src/routers/index.ts`
(composed from `livekit`, `moderation`, `models`, `recommendations`, `rebuild`, `billing`,
`rating`, and `todo` routers), built on `@orpc/server` `^1.13.14` with Zod
`^4.1.13` validators. It exports both `AppRouter` and `AppRouterClient` types. Authorization
is expressed as oRPC middleware in `packages/api/src/index.ts` as `publicProcedure`,
`protectedProcedure`, and `adminProcedure`, layered on a Hono-derived `Context` produced by
`createContext` in `packages/api/src/context.ts`. `apps/server/src/index.ts` runs on
**Bun** (`bun run --hot src/index.ts` in dev, `tsdown` for build) and mounts the same router
twice: an `RPCHandler` at `/rpc` and an `OpenAPIHandler` with `OpenAPIReferencePlugin` at
`/api-reference`. Both clients import the client type — `apps/native/utils/orpc.ts` and
`apps/web/src/utils/orpc.ts` each declare `export const client: AppRouterClient =
createORPCClient(link)` over an `RPCLink` to `${serverUrl}/rpc`. The schema is shared, not
duplicated.

## Rationale

Exporting `AppRouterClient` from the router file means a client cannot drift from the
server without a type error: adding a required input field to `livekit.token` in
`packages/api/src/routers/livekit.ts` breaks the `useQuery` call site in
`apps/native/app/call/[room].tsx` at compile time. Mounting the router twice costs one
additional handler and buys a browsable `/api-reference` surface with a generated schema —
which, combined with `uaBlocker({ blocklist: aiBots })` in the same file, reads as a
deliberate choice to publish a documented contract while refusing to serve it to scrapers.
**Inference:** keeping `hono` as a `devDependency` of `packages/api` — used only for the
`Context` type — is what allows the contract package to stay runtime-agnostic; no comment
in the repository states this.

## Consequences

**Accepts:**
- One contract, three consumers. `livekit.token`, `moderation.*`, `billing.*` and the rest
  are written once and consumed by native, web, and server alike.
- Input validation and authorization are structural, not per-handler convention: a procedure
  declared `protectedProcedure` cannot ship without a session check.
- The same router yields both a typed RPC client and an OpenAPI reference from one definition.
- The server is free to change its HTTP layer without touching the contract package.

**Costs:**
- Two transports must both be kept working. The RPC path and the OpenAPI path have separate
  interceptors and separate rate-limit mounts in `apps/server/src/index.ts`, and a handler
  that works under one need not behave identically under the other.
- Because `/api-reference` is mounted on the same app, the API documentation is gated by the
  same 30 s timeout and 100 req/min rate limit as `/rpc`, and is invisible to the AI bots it
  is otherwise written for.
- `createContext` sets `auth: null` and returns only `session`, so any handler needing a
  Better Auth *instance* rather than a resolved session has no path to one from context.
- Clients must construct their own `QueryClient`; `apps/native/utils/orpc.ts` and
  `apps/web/src/utils/orpc.ts` each create one independently with different error handling.

## Revisit when

A second server runtime appears, or the `/api-reference` surface needs to be reachable
without inheriting the RPC middleware stack.
