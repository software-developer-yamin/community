# 0003. Better Auth pinned to 1.6.11, with database-backed sessions and client-side proactive refresh

**Status:** Accepted
**Date:** 2026-10-11
**Evidence:** pnpm-workspace.yaml, packages/auth/src/index.ts, packages/auth/src/session-refresh.ts, packages/db/src/schema/auth.ts, packages/ui/src/components/token-refresh-provider.tsx, apps/native/lib/auth-client.ts

## Context

Two client surfaces authenticate against the same server, and they cannot use the same
session transport. The web admin runs in a browser and could rely on cookies alone; the
native app runs on a device where `apps/native/utils/orpc.ts` has to set `credentials:
"omit"` and forward the session by hand via `authClient.getCookie()` in a request header.
That asymmetry is why `packages/auth` exists as its own package and why
`@better-auth/expo` is catalogued alongside the server library. The sessions are long — a
learner should not be asked to log in on every app open — but the product treats a silent
mid-call session expiry as a broken call, so the refresh path had to be explicit rather
than incidental.

## Decision

Authentication runs on `better-auth: 1.6.11` and `@better-auth/expo: 1.6.11`, both pinned
**exactly** — the only two entries in `pnpm-workspace.yaml` without a caret. Sessions are
database-backed, not stateless: `packages/db/src/schema/auth.ts` defines the `session`
table with a unique `token`, an `expiresAt`, and indexes on `userId` and `expiresAt`, and
`packages/auth/src/index.ts` wires Better Auth to it via `drizzleAdapter(db, { provider:
"pg" })`. Session policy is set in one place: `expiresIn: 2_592_000` (30 days),
`updateAge: 86_400` (rolling extension once a day), `freshAge: 0` (every check reads the
database). Providers are Google social, email/password, and the `phoneNumber` plugin for SMS
OTP, with account linking across `google` and `email-password`. Client-side liveness is a
`TokenRefreshProvider` in `packages/ui/src/components/token-refresh-provider.tsx` that polls
every 60 s and delegates to `proactiveRefresh` in `packages/auth/src/session-refresh.ts`,
which refreshes inside a 60 s expiry window with three attempts and exponential backoff.

## Rationale

Pinning Better Auth exactly rather than to a caret is the same judgement as pinning
`@better-auth/expo` to the identical version: the Expo plugin and the server library are a
matched pair, and an automatic minor bump on one side would break the native session
transport in a way no typechecker would catch. Database-backed sessions over a stateless
signed token are what let `adminProcedure` in `packages/api/src/index.ts` read
`context.session.user.role` on every request with no token-verification service to keep
running. **Inference:** the explicit `proactiveRefresh` helper exists because 30-day sessions
with `freshAge: 0` mean a client that only reads the session on demand can hold a token that
is valid at check time and dead at request time; no repository comment says this, but the
retry-and-backoff shape and the `TokenRefreshProvider` mount in `apps/native/app/_layout.tsx`
are consistent with it. The alternative — short-lived access plus refresh tokens — is
described and rejected in the comment at `packages/auth/src/session-refresh.ts:48-50`.

## Consequences

**Accepts:**
- `role` reaches the API as a session field, so admin gating is two middleware lines rather
  than a separate authorization service.
- One provider handles Google, email/password, and SMS OTP, and account linking means a
  learner who signed up by phone can attach Google later without losing their user row.
- The 30-day window survives app restarts; a network blip mid-call does not end a session.
- Shared, framework-agnostic refresh logic: both clients satisfy the same `AuthClient`
  interface from `packages/auth/src/session-refresh.ts`.

**Costs:**
- Every authenticated request touches Postgres. `freshAge: 0` is chosen deliberately
  ("always check session from DB") and buys immediate revocation at the cost of a database
  round-trip per API call.
- The exact pin means no automatic security patches; an upgrade is a deliberate act that
  must move `better-auth` and `@better-auth/expo` together.
- Cookie attributes are `sameSite: "strict"`, `secure: true`, `httpOnly: true`, which forces
  the native app to hand-marshal cookies through `RPCLink` rather than letting the platform
  manage them — visible as the manual `headers()` override in `apps/native/utils/orpc.ts`.
- `proactiveRefresh` retries three times then throws; the caller
  (`TokenRefreshProvider`) converts that into a 10 s polling backoff, so a genuinely expired
  session produces a long silent interval before the user is told anything.

## Revisit when

Session-table read latency becomes a measurable share of API p99, or the 30-day window has to
be cut for a compliance requirement — either would justify moving to short-lived access
tokens with a refresh token, which the current schema has no column for.
