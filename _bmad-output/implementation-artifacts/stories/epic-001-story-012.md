---
baseline_commit: 81cc3c8205585c1852037ba57f59796698e7daa4
---

# Story 1.2: Silent Token Refresh

Status: ready-for-dev

## Story

As a Learner,
I want my access token to refresh automatically in the background,
So that I never see a login screen or get dropped from a call due to token expiry.

## Acceptance Criteria

1. **Proactive refresh** — Given I am actively using the app, When my access token is ≤60s from expiry, Then the system refreshes it silently without user-visible interruption. (epics#L264-L266)
2. **In-call refresh** — Given I am in the middle of a call, When my access token expires, Then the call continues without interruption And the token is refreshed in the background. (epics#L268-L271)
3. **Retry on failure** — Given I am navigating between screens, When a token refresh fails, Then the system retries silently up to 3 times And only redirects to login if all retries fail. (epics#L273-L276)
4. **No UI flash** — During any silent refresh attempt (including retries), the UI must never show a loading spinner, login redirect, or any user-visible indicator. Failed refreshes are invisible — only final failure after 3 retries shows a session-expired state.
5. **Cross-platform parity** — Both native (Expo SecureStore) and web (httpOnly+secure+SameSite=strict cookie) achieve equivalent proactive refresh behaviour.
6. **Token rotation chain** — When a refresh occurs, the old refresh token is invalidated and the new one stored, preventing replay attacks. The `account.refresh_token` column must update correctly.

## Tasks / Subtasks

- [ ] Task 1: Server-side session refresh configuration (AC: 1, 6)
  - [ ] 1.1 Verify `updateAge: 86400` in Better-Auth config correctly extends `expiresAt` on active use (currently set in `packages/auth/src/index.ts`)
  - [ ] 1.2 Add session refresh endpoint or middleware hook that proactively refreshes sessions nearing expiry
  - [ ] 1.3 Verify refresh token rotation — Better-Auth rotates `account.refresh_token` on each refresh cycle; add test confirming this
  - [ ] 1.4 Ensure session cookie `maxAge` on web is aligned with proactive refresh timing

- [ ] Task 2: Native client silent refresh (AC: 1, 2, 3, 4, 5)
  - [ ] 2.1 Implement `TokenRefreshProvider` or refresh interceptor for native Better-Auth client that checks token expiry before each API call
  - [ ] 2.2 Proactive refresh: when session `expiresAt` is ≤60s away, call `authClient.refresh()` in background
  - [ ] 2.3 Retry logic: on refresh failure, retry up to 3 times with exponential backoff (500ms, 1s, 2s)
  - [ ] 2.4 Integrate with existing `<SessionRestoreGuard>` — ensure refresh happens before guard checks session validity
  - [ ] 2.5 Persist refreshed session token to SecureStore after each successful refresh

- [ ] Task 3: Web client silent refresh (AC: 1, 2, 3, 4, 5)
  - [ ] 3.1 Implement refresh interceptor for web Better-Auth client that checks session expiry
  - [ ] 3.2 Proactive refresh via `authClient.refresh()` with same ≤60s window
  - [ ] 3.3 Retry logic matching native (3 attempts, exponential backoff)
  - [ ] 3.4 Integrate with existing `<SessionGuard>` — refresh before guard checks
  - [ ] 3.5 Ensure httpOnly cookie is updated on refresh (handled by server via Set-Cookie)

- [ ] Task 4: In-call refresh protection (AC: 2)
  - [ ] 4.1 Ensure LiveKit connection does NOT depend on session token after room join (uses short-lived room tokens)
  - [ ] 4.2 If any API calls during call need auth, route through refresh interceptor
  - [ ] 4.3 Refresh must not interrupt WebRTC media flow

- [ ] Task 5: Error handling & graceful degradation (AC: 3, 4)
  - [ ] 5.1 Handle 401 responses from API calls by attempting silent refresh transparently (axios/fetch interceptor)
  - [ ] 5.2 On final failure after 3 retries, emit a session-expired event that downstream consumers can listen to
  - [ ] 5.3 No crash or frozen state on refresh failure — app stays on current screen showing cached data
  - [ ] 5.4 Log structured errors for refresh failures via evlog (action: "token-refresh", event: "failure")

- [ ] Task 6: Testing (AC: all)
  - [ ] 6.1 Unit test: refresh interceptor — token near expiry triggers refresh
  - [ ] 6.2 Unit test: retry logic — 3 failures → session-expired event
  - [ ] 6.3 Unit test: successful refresh updates stored token
  - [ ] 6.4 Integration test: server validates rotated token and rejects old token
  - [ ] 6.5 E2E test: app stays on screen during silent refresh (no redirect)

## Dev Notes

- **Better-Auth already configured** with `updateAge: 86400` (extends session on active use within 1 day of expiry) and `expiresIn: 2592000` (30 days) in `packages/auth/src/index.ts`. The proactive refresh (≤60s window) needs explicit client-side interceptor logic since Better-Auth's `freshAge: 0` means every request hits the DB.
- **Session schema** in `packages/db/src/schema/auth.ts` has `session` table with `expiresAt` (timestamp), `token` (text, unique), `userId`. Indexes: `session_userId_idx`, `session_expiresAt_idx` — both already exist.
- **Account schema** has `refresh_token` column and `refreshTokenExpiresAt` for OAuth provider refresh tokens — verify rotation is correctly persisted.
- **Native client** at `apps/native/lib/auth-client.ts` uses `expoClient()` + SecureStore. The expo plugin already handles basic session persistence. Need to add proactive refresh.
- **Web client** at `apps/web/src/lib/auth-client.ts` uses standard `createAuthClient()` with cookie-based sessions. Better-Auth handles cookie refresh via server response.
- **Existing session guards**: `<SessionRestoreGuard>` at `apps/native/components/session-restore-guard.tsx` (native), `<SessionGuard>` at `apps/web/src/components/session-guard.tsx` (web). Both show skeleton while `isPending`, then render content. Refresh interceptor should fire before or during this pending phase.
- **Cold-start performance**: Silent refresh must complete within p95 cold-start budget (2.5s to home screen). Refresh initiation is cheap (network call), but must not block UI thread.
- **LiveKit room tokens** are short-lived (5min) and room-scoped — not tied to session token. In-call refresh concerns only apply if the app makes API calls during a call (e.g., reporting, skip, end call).
- **Project monorepo structure**: auth in `packages/auth/`, shared UI in `packages/ui/`, apps in `apps/web/` (Next.js) and `apps/native/` (Expo). Follow existing patterns from Story 1.1.
- **Ultracite enforced**: Run `pnpm dlx ultracite fix` before committing. No `console.log`, no `as any`, no `@ts-ignore`.
- **evlog integration**: Log refresh attempts and failures via evlog's `log.info()` / `log.error()` with action: "token-refresh".

### Key Files & Their Roles

| File | Role | Change |
|------|------|--------|
| `packages/auth/src/index.ts` | Better-Auth server config | VERIFY — `updateAge`, `freshAge`, `expiresIn` already set |
| `packages/auth/src/session-refresh.ts` | NEW — shared refresh interceptor logic | CREATE |
| `packages/ui/src/components/token-refresh-provider.tsx` | NEW — shared React provider for proactive refresh | CREATE |
| `apps/native/lib/auth-client.ts` | Native auth client with SecureStore | MODIFY — add refresh interceptor |
| `apps/native/components/session-restore-guard.tsx` | Native session guard | MODIFY — integrate refresh |
| `apps/native/app/` | App entry/layout | MODIFY — wrap with refresh provider |
| `apps/web/src/lib/auth-client.ts` | Web auth client | MODIFY — add refresh interceptor |
| `apps/web/src/components/session-guard.tsx` | Web session guard | MODIFY — integrate refresh |
| `apps/web/src/app/layout.tsx` | Web layout | MODIFY — wrap with refresh provider |
| `packages/db/src/schema/auth.ts` | DB schema | VERIFY — indexes exist |
| `apps/server/src/index.ts` | Hono server | VERIFY — auth handler at `/api/auth/*` |

### References

- [PRD FR-2] `_bmad-output/planning-artifacts/prds/prd-community-2026-06-09/prd.md` — silent token refresh
- [Epic 1 Story 1.2] `_bmad-output/planning-artifacts/epics.md#L254-L276` — full ACs and story definition
- [Architecture: Auth] `_bmad-output/planning-artifacts/architecture.md#Authentication` — SecureStore, Better-Auth cache, refresh rotation
- [Better-Auth session docs] `https://www.better-auth.com/docs/concepts/session` — session management, freshAge, updateAge
- [Better-Auth client refresh] `authClient.refresh()` — explicit silent refresh call
- [Story 1.1 file] `_bmad-output/implementation-artifacts/stories/epic-001-story-011.md` — previous story patterns, session guard structure
- [Existing auth-server config] `packages/auth/src/index.ts` — baseURL, session config, cookies, expo() plugin
- [Existing native auth client] `apps/native/lib/auth-client.ts` — expoClient with SecureStore
- [Existing web auth client] `apps/web/src/lib/auth-client.ts` — standard createAuthClient
- [Session DB schema] `packages/db/src/schema/auth.ts` — session table with expiresAt, token, userId; indexes exist
- [Ultracite coding standards] `CLAUDE.md`, `AGENTS.md` — type safety, no `as any`, no console.log, Biome linting

## Dev Agent Record

### Agent Model Used

Sisyphus (Claude Opus 4.7) via OpenCode

### Completion Notes

- Story 1.2 covers FR-2 (silent token refresh) fully — proactive refresh, in-call, retry logic, cross-platform
- 6 tasks covering: server config, native client, web client, in-call protection, error handling, testing
- Reuses existing infrastructure: Better-Auth `updateAge`, `expiresIn`, `freshAge` settings; `expoClient` SecureStore; cookie-based sessions
- Dependencies: Story 1.1 completed (session persistence verified working)
- No blocking dependencies on other stories for the token refresh work; refresh rotation E2E integrates with Story 1.1's rotation verification
- In-call refresh is generally not needed for LiveKit (short-lived room tokens) but API calls during call must not fail auth
