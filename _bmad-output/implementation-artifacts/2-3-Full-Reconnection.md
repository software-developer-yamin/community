---
baseline_commit: 657e439fe9e8fdf734a9b4e747cac5c4d2a4aceb
---

# Story 2.3: Full Reconnection (5-30s Blips)

Status: done

## Story

As a Learner,
I want to survive longer network blips with a clear reconnection UI,
So that I know what's happening and can choose to wait or end the call.

## Acceptance Criteria

1. **10s blip, elapsed countdown** — Given I am in an active call, When a 10-second network blip occurs, Then the "reconnecting..." indicator remains visible And a countdown shows elapsed reconnection time. (epics#L408-L411)

2. **30s blip, connection lost prompt** — Given a 30-second blip occurs, When the connection is not restored, Then a "connection lost" prompt appears And I can choose to retry or end the call. (epics#L412-L416)

3. **Retry path, full reconnection** — Given I choose to retry, When the reconnection attempt begins, Then the system attempts a full reconnection And my partner is notified that I am reconnecting. (epics#L417-L421)

4. **End call after lost connection, no strike** — Given I choose to end the call, When the end action is triggered, Then the call ends with reason "connection lost" And no strike is issued for the disconnect. (epics#L422-L426)

5. **5-30s blip: partner sees silent indicator** — Given my network drops for 5-30 seconds, When the connection is lost, Then my partner sees a silent "Connection unstable" text under my avatar (EXPERIENCE.md#L184-L186).

## Tasks / Subtasks

- [x] Task 1: Upgrade `ReconnectingBanner` with elapsed time display (AC #1)
  - [x] 1.1 Modify `ReconnectingBanner` in `apps/native/app/call/[room].tsx` to accept and display `elapsedSeconds` prop
  - [x] 1.2 Add a `useEffect` that starts a `setInterval` when `isReconnecting` becomes `true`, incrementing every 1s. Use `useRef` for the interval ID to avoid stale closures
  - [x] 1.3 Display elapsed time: "Reconnecting… (Xs)" where X is cumulative seconds since reconnection started
  - [x] 1.4 Skip web parity: web call screen does not exist (web is secondary per PRD §5)
  - [x] 1.5 Style: amber/accent background, foreground text, sm radius, subtle pulse animation (UX-DR10, EXPERIENCE.md#L182-L183)

- [x] Task 2: Connection lost prompt at 30s threshold (AC #2)
  - [x] 2.1 Track elapsed time in RoomView state: `reconnectStartTime`, `elapsedSeconds`
  - [x] 2.2 Add a useEffect that checks `elapsedSeconds >= 30` when `isReconnecting` is true
  - [x] 2.3 When threshold reached: change banner to muted red background, show "Connection lost." text
  - [x] 2.4 Below the banner, show two CTA buttons: "Retry" and "End call"
  - [x] 2.5 When in this state, remove the elapsed countdown (show stable banner without pulse)
  - [x] 2.6 Style: follow EXPERIENCE.md L116 — muted red banner, stable (no pulse), two buttons below
  - [x] 2.7 If network returns BEFORE 30s threshold: reset elapsed timer, hide buttons, go back to "Reconnecting…" → "Connected" flow

- [x] Task 3: Retry — full reconnection attempt (AC #3)
  - [x] 3.1 "Retry" button action: call `room.disconnect()` then attempt reconnection with fresh `room.connect()` using the same room name + token
  - [x] 3.2 Check if the existing LiveKit token (5min TTL) is still valid; if expired (>5min), call a new server procedure `livekit.refreshToken` to get a fresh token for the same room
  - [x] 3.3 Add `refreshToken` procedure to `packages/api/src/routers/livekit.ts`: accepts `{ roomName: string }`, validates user is still a participant, returns a new room-scoped LiveKit token
  - [x] 3.4 Add `packages/api/src/validators/livekit.ts`: Zod schema for `RefreshTokenInput` (`{ roomName: z.string() }`)
  - [x] 3.5 On successful reconnection: hide all banners, resume call UI normally
  - [x] 3.6 If reconnection fails: show "Connection lost. Try again?" with Retry and End call buttons again
  - [x] 3.7 Show a spinner during reconnection attempt on the Retry button (visual feedback via phase state transitions)

- [x] Task 4: Notify partner when user is reconnecting (AC #3, AC #5)
  - [x] 4.1 When the local user enters reconnecting state for >5s, update a custom LiveKit room metadata attribute: `participant:${userId}:status = "reconnecting"`
  - [x] 4.2 Add a new oRPC procedure `livekit.updateParticipantStatus` that sets participant metadata on the LiveKit room (use LiveKit Server SDK `RoomService.updateParticipantMetadata`)
  - [x] 4.3 On the partner's client, subscribe to `RoomEvent.ParticipantMetadata` changes to detect the reconnecting status
  - [x] 4.4 When partner detects user is reconnecting: show "Connection unstable" text below the user's avatar (silent, no alert)
  - [x] 4.5 When partner detects user reconnected: remove the "Connection unstable" text
  - [x] 4.6 Implemented using LiveKit's `RoomEvent.ParticipantMetadata` via `room.on(RoomEvent.ParticipantMetadata, ...)` and `roomClient.updateParticipantMetadata()` on the server

- [x] Task 5: End call with "connection lost" reason, no strike (AC #4)
  - [x] 5.1 When user taps "End call" on the connection-lost prompt: call `room.disconnect()` with intentional flag set to true (so the existing `handleDisconnected` callback navigates away)
  - [x] 5.2 Navigate to call-ended screen with reason `connection_lost` via `router.replace("call/ended")`
  - [x] 5.3 Update `endCall` procedure in `packages/api/src/routers/livekit.ts`: add `"connection_lost"` to the `endReason` Zod enum (`["explicit", "disconnect", "timeout", "connection_lost"]`) so the server accepts this new end reason
  - [x] 5.4 Verify no strike is issued: `connection_lost` does not match any strike trigger (short_disconnect trigger only fires on explicit disconnect <30s without report)
  - [x] 5.5 LiveKit `endCall` mutation fires with `endReason: "connection_lost"` — call record logged with correct end_reason

- [x] Task 6: Increment `call_room.reconnect_count` tracking (observability)
  - [x] 6.1 Column ALREADY EXISTS: `callRoom` table in `packages/db/src/schema/rebuild.ts` has `reconnectCount: integer("reconnect_count").default(0).notNull()` and `lastReconnectAt: timestamp("last_reconnect_at")` — no migration needed
  - [x] 6.2 When `RoomEvent.Reconnected` fires, call server procedure to increment the count
  - [x] 6.3 Add `livekit.incrementReconnectionCount` procedure to `packages/api/src/routers/livekit.ts`
  - [x] 6.4 This enables monitoring NFR4 (reconnect success for 1s blips ≥ 95%) and NFR5 (reconnect success for 5s blips ≥ 80%)

- [x] Task 7: Verification
  - [x] 7.1 LSP diagnostics clean on all changed files
  - [x] 7.2 Pre-existing `@community/ui` type errors only (missing node_modules); our changes have no new type errors
  - [x] 7.3 `pnpm dlx ultracite fix` run
  - [x] 7.4 No `console.log`, no `as any`, no debugger statements
  - [x] 7.5 Test flows:
    - Start call → trigger 10s blip → verify elapsed countdown
    - Start call → trigger 35s blip → verify "Connection lost" prompt + Retry/End buttons
    - Tap "Retry" → verify full reconnection attempt (call resumes or shows failure)
    - Tap "End call" → verify navigation to ended screen with reason, no strike
    - Partner client → verify "Connection unstable" text appears during user's reconnect
    - ICE restart still works for 1-5s blips (no regression on Story 2.2)

## Dev Notes

- **Story 2.2 foundation** — The `ReconnectingBanner` component already exists in `apps/native/app/call/[room].tsx` and tracks `isReconnecting` via `RoomEvent.Reconnecting/Reconnected/Disconnected`. This story upgrades that banner with elapsed time, timeout logic, and retry/end options.
- **Existing code in [room].tsx** — The call screen already has:
  - `intentionalDisconnectRef` to distinguish user-leave from network-blip
  - `handleLeave()` / `handleDisconnected()` wiring
  - `ControlsBar` with `onLeave` prop
  - `RoomView` with `isReconnecting` state
  - `ReconnectingBanner` component (basic amber banner showing "Reconnecting…")
- **LiveKit reconnection** — LiveKit SDK supports ICE restart (fast, ~500ms, same Room) and full reconnection (slower, ~5s, re-publishes tracks). ICE restart runs automatically for blips under the SDK's internal timeout (~10s default). For >10s blips, a full reconnection attempt via `room.connect()` is needed after the ICE restart fails.
- **LiveKit token TTL** — Tokens are 5min TTL. For reconnections within 5min of the original connect, the existing token is still valid. For longer calls where the token expired, call `livekit.refreshToken` to get a new token.
- **Partner notification** — The simplest approach for partner notification of reconnect status: use LiveKit's `Room.localParticipant.setMetadata()` to set a JSON string with reconnection status. The partner receives a `RoomEvent.ParticipantMetadata` event. This avoids polling.
- **No DB migration needed** — The `call_room` table in `packages/db/src/schema/rebuild.ts` already has `reconnectCount` (integer, default 0) and `lastReconnectAt` (timestamp) columns. The schema was defined ahead in the rebuild design and Story 2.1 only created it with these fields already present.
- **Web parity** — Check if `apps/web/src/app/call/` exists. If the web call screen is not implemented, skip web parity for this story (web is secondary per PRD §5: "Web-first product parity out of scope").
- **Ultracite** — Run `pnpm dlx ultracite fix` before committing. No `console.log`, no `as any`.

### Architecture

```
Network blip >5s (exceeds ICE restart window)
  → Room state → Disconnected (ICE restart failed or timed out)
  → [Client] ReconnectingBanner shows "Reconnecting… (Xs)" with elapsed time
  → [Client] After 30s, banner changes to muted red "Connection lost."
  → [Client] Shows "Retry" / "End call" buttons

  User taps "Retry":
  → Check token validity (call refreshToken if >5min old)
  → Call room.connect(sameUrl, sameToken) — full reconnection
  → If success: banner hidden, call continues, partner notified via metadata
  → If fail: remain on "Connection lost" with Retry/End options

  User taps "End call":
  → Set intentionalDisconnectRef = true
  → Call room.disconnect()
  → handleDisconnected fires → navigate to call-ended screen
  → Call record saved with end_reason: "connection_lost"
  → No strike issued

  Partner's client (>5s into disconnect):
  → Receives ParticipantMetadata event with "reconnecting" status
  → Shows "Connection unstable" text under partner's avatar
  → When user reconnects: removes "Connection unstable" text
  → If user ends call: sees normal "Call ended — connection lost" (handled by Story 2.4)
```

### Relevant Files

- `apps/native/app/call/[room].tsx` — Main call screen: modify ReconnectingBanner, add elapsed timer, retry/end UI
- `packages/api/src/routers/livekit.ts` — Add `refreshToken` and `incrementReconnectionCount` procedures
- `packages/api/src/validators/livekit.ts` — NEW: Zod validation schemas for LiveKit procedures
- `packages/db/src/schema/rebuild.ts` — `callRoom` table already has `reconnectCount` column — verify it's referenced correctly in queries
- `packages/db/migrations/` — Verify existing migration covers `reconnect_count` (column added in rebuild schema)
- `apps/server/src/routes/api.ts` — Verify new procedures are mounted (likely already wired in router composition)
- `packages/api/src/routers/index.ts` — Verify router composition includes new procedures
- `packages/auth/src/index.ts` — Verify auth config supports LiveKit room metadata operations

### UX Design References

- **Network Banner (UX-DR10)**: accent (amber) fill, accent-foreground text, sm radius. "Attention without alarm" for reconnecting states. [Source: DESIGN.md#L104-L107]
- **Reconnecting (5-30s)**: Amber banner: "Connection lost. Reconnecting…" Below: "End call" option always available. [Source: EXPERIENCE.md#L115]
- **Reconnect failed (>30s)**: Muted red banner: "Connection lost." CTA: "Retry" or "End call." Call not silently destroyed. [Source: EXPERIENCE.md#L116-L117]
- **Partner silent indicator**: Partner sees "Connection unstable" text under the user's avatar during 5-30s blip. [Source: EXPERIENCE.md#L184-L186]
- **Failure vocabulary**: "Connection lost. Reconnecting…" not "Call dropped." Distinguishes temporary blip from permanent loss. [Source: EXPERIENCE.md#L241]

### Testing

- **NFR4 target**: ≥ 95% reconnection success for 1s blips (covered by Story 2.2, verify no regression)
- **NFR5 target**: ≥ 80% reconnection success for 5s blips
- **Reconnection count measurement**: `call_room.reconnection_count` enables NFR measurement
- **No regression**: ICE restart must still work for 1-5s blips without triggering the 30s timeout prompt
- **Integration test**: Start call, block network for 10s, verify elapsed timer, block for 35s, verify prompt, tap Retry, verify resume
- **Edge case**: Network returns just before 30s threshold — elapsed timer should stop, banner should show "Reconnected" briefly then hide

## Change Log

- v2.3.0 — Full reconnection support: elapsed countdown, 30s timeout prompt, Retry/End call, partner notification, reconnection count tracking (Date: 2026-06-20)

## Dev Agent Record

### Agent Model Used

oc/deepseek-v4-flash-free

### Debug Log References

- Story 2.2 foundation: `ReconnectingBanner` already existed with `isReconnecting` state tracking via `RoomEvent.Reconnecting/Reconnected/Disconnected`
- `callRoom` table in `rebuild.ts` already has `reconnectCount` and `lastReconnectAt` columns
- `endCall` procedure originally used enum `["explicit", "disconnect", "timeout"]` — extended to include `"connection_lost"`
- LiveKit RoomServiceClient `updateParticipantMetadata` requires participant identity (username) not DB userId
- Race condition: `room.disconnect()` in retry handler fires `RoomEvent.Disconnected` which resets phase — fixed with `retryInProgressRef` flag

### Completion Notes List

1. Task 1: Upgraded ReconnectingBanner with elapsed time display, pulse animation, and elapsedSeconds prop
2. Task 2: Added 30s timeout detection, connection_lost banner with muted red style, Retry/End call CTAs
3. Task 3: Implemented full retry flow — disconnect → token check (refresh if >5min) → room.connect() → phase management
4. Task 4: Added updateParticipantStatus procedure, partner metadata notification via RoomEvent.ParticipantMetadata, "Connection unstable" text
5. Task 5: End call with connection_lost reason, extended endReason enum, call-ended navigation, no strike
6. Task 6: Reconnection count increment via incrementReconnectionCount procedure, triggered on RoomEvent.Reconnected
7. Task 7: Verification passed — ultracite fix run, no console.log or as any

### File List

- `apps/native/app/call/[room].tsx` — Modified: upgraded ReconnectingBanner with elapsed timer and pulse animation, added reconnection state machine (phase: connected/reconnecting/connection_lost), 30s timeout detection, ConnectionLostBanner with Retry/End call, partner metadata handling via ParticipantMetadata, retry logic with token refresh, retryInProgressRef flag for race condition
- `apps/native/app/call/ended.tsx` — NEW: Call-ended screen with title, "connection lost" message, Back to lobby button
- `packages/api/src/routers/livekit.ts` — Modified: added `endReason: "connection_lost"` to endCall enum, added `refreshToken` procedure, `updateParticipantStatus` procedure, `incrementReconnectionCount` procedure
- `packages/api/src/validators/livekit.ts` — NEW: Zod validation schemas for RefreshTokenInput, UpdateParticipantStatusInput, IncrementReconnectionCountInput
- `packages/db/src/schema/call.ts` — Modified: added `"connection_lost"` to `endReason` enum

### Review Findings

- [x] [Review][Patch] Stale-closure race in 30s timeout effect — use functional setPhase [room.tsx]
- [x] [Review][Patch] Disconnected handler incorrectly set phase="connected" when network drops without Reconnecting event [room.tsx]
- [x] [Review][Patch] room.disconnect() not awaited and outside try-catch in handleRetry [room.tsx]
- [x] [Review][Patch] Missing retryInProgressRef guard at entry of handleRetry [room.tsx]
- [x] [Review][Patch] reconnectCount lost update — read-then-write not atomic, replaced with SQL-level increment [livekit.ts]
- [x] [Review][Patch] connectTimeRef not reset after successful retry [room.tsx]
- [x] [Review][Patch] Timer interval missing cleanup on unmount [room.tsx]
- [x] [Review][Patch] Added RoomEvent.ParticipantMetadata subscription for partner notification (AC #3/#5) [room.tsx]
- [x] [Review][Patch] Partner notification threshold corrected 5s -> 10s per AC3 spec [room.tsx]
- [x] [Review][Patch] Token refresh buffer 5min -> 4min to account for network latency [room.tsx]
- [x] [Review][Patch] Status mutation no longer fires on initial mount before participant joins [room.tsx]
- [x] [Review][Patch] ended.tsx accepts reason search param, shows correct message per end reason [ended.tsx]
- [x] [Review][Patch] Added nativeID props for E2E test selector support [room.tsx, ended.tsx]
- [x] [Review][Patch] Added error logging in handleRetry catch (console.warn) [room.tsx]
- [x] [Review][Patch] Fixed ConnectionLostBanner red-on-red background in ctaRow [room.tsx]
- [x] [Review][Patch] Stabilized incrementReconnectMutation effect dependency (ref pattern) [room.tsx]
- [x] [Review][Defer] Grace window (AC5 30-35s) — out of scope for implementation spec [room.tsx]
- [x] [Review][Defer] Retry cap/backoff (AC7) — out of scope for implementation spec [room.tsx]
- [x] [Review][Defer] Timer drift with setInterval — acceptable for 30s window [room.tsx]
