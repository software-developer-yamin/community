---
baseline_commit: 81cc3c8205585c1852037ba57f59796698e7daa4
---

# Story 2.2: ICE Restart Reconnection (1-5s Blips)

Status: ready-for-dev

## Story

As a Learner,
I want to survive 1-5 second network blips without losing my call,
So that brief connectivity issues don't disrupt my practice session.

## Acceptance Criteria

1. **1s blip, seamless resume** — Given I am in an active call, When a 1-second network blip occurs, Then the call resumes within 500ms And my partner experiences no audio dropout or UI change. (epics#L382-L386)
2. **5s blip, reconnecting indicator** — Given I am in an active call, When a 5-second network blip occurs, Then a "reconnecting..." indicator appears to me only And my partner sees no change And the call resumes if connectivity returns. (epics#L387-L392)
3. **ICE restart completion** — Given the network recovers, When the ICE restart completes, Then the "reconnecting..." indicator disappears And the call continues without requiring a new room or token. (epics#L393-L396)
4. **No silent failure** — Given a network blip occurs, When the connection is lost, Then the system does NOT navigate away from the call screen And does NOT emit a "call ended" event.

## Tasks / Subtasks

- [ ] Task 1: Add reconnection state tracking to native call screen
  - [ ] 1.1 Add `connectionState` listener to the LiveKit `Room` object using `useRoomContext()` in the call screen — detect `Reconnecting`, `Connected`, `Disconnected` states
  - [ ] 1.2 Create a `ReconnectingBanner` component: amber/accent fill, "Reconnecting…" text, subtle pulse animation, positioned at top of call screen (UX-DR10: Network Banner)
  - [ ] 1.3 Show banner when `connectionState === Reconnecting`, hide when `Connected` or `Disconnected`
  - [ ] 1.4 Ensure banner only renders for the disconnecting user, not the partner (connection state is local to each client)

- [ ] Task 2: Configure LiveKit ICE restart behavior
  - [ ] 2.1 Set `LiveKitRoom` options to enable automatic ICE restart: `adaptiveStream`, `dynacast`, and appropriate reconnection defaults
  - [ ] 2.2 Configure `roomOptions.audioCaptureDefaults` and `roomOptions.videoCaptureDefaults` if needed
  - [ ] 2.3 Verify `livekit-client` default reconnection timeout covers 5s blips (LiveKit SDK default is 10s reconnect timeout, which covers 1-5s blips)

- [ ] Task 3: Add reconnection state to web call screen
  - [ ] 3.1 Find or create web call screen in `apps/web/src/app/call/`
  - [ ] 3.2 Add `useConnectionState` or equivalent from `livekit-client` or `@livekit/components-react`
  - [ ] 3.3 Add matching `ReconnectingBanner` web component with Tailwind amber styling
  - [ ] 3.4 Ensure banner matches UX Design requirements (UX-DR10)

- [ ] Task 4: Handle token expiry during reconnection
  - [ ] 4.1 Check if the LiveKit token (5min TTL) may expire during extended blips
  - [ ] 4.2 If needed, add a server procedure to refresh the LiveKit token for an active room without requiring a new room
  - [ ] 4.3 Wire token refresh into the reconnection flow on the client

- [ ] Task 5: Webhook enhancements (if needed)
  - [ ] 5.1 Verify existing `/livekit/webhook` handler handles `participant_disconnected` events
  - [ ] 5.2 Ensure short blips do not trigger `room.finished` (emptyTimeout is 30s, so 1-5s blips won't trigger it)

- [ ] Task 6: Verification
  - [ ] 6.1 LSP diagnostics clean on changed files
  - [ ] 6.2 Build passes (`pnpm check-types`)
  - [ ] 6.3 `pnpm dlx ultracite fix` run
  - [ ] 6.4 No `console.log`, no `as any`

## Dev Notes

- **LiveKit Client SDK** (`livekit-client`) has built-in ICE restart. The `Room` object emits `Room.Event.Reconnecting` when the ICE transport drops and `Room.Event.Reconnected` when ICE restart succeeds.
- No new server procedures needed unless token expiry during reconnection is an issue (tokens are 5min TTL, typical reconnection is <10s).
- The native app (`apps/native/app/call/[room].tsx`) uses `@livekit/react-native` with `useRoomContext()`. Add connection state listener via `room.on('signalReconnecting', ...)` or check `room.state`.
- For web: check if `apps/web/src/app/call/` exists; if not, use `@livekit/components-react` `useConnectionState` hook or `livekit-client` directly.
- The ReconnectingBanner styling should follow UX-DR10: accent (amber) fill, accent-foreground text, sm radius — "Attention without alarm".
- The `onDisconnected` callback in `LiveKitRoom` currently calls `router.back()`. This is dangerous during a blip — short network drops should NOT navigate away. Need to distinguish between "intentional disconnect" and "network blip disconnect."
- Use `pnpm dlx ultracite fix` before committing. No `console.log`, no `as any`.
- Story 2.1 already implemented `createCallRoom`, `endCall`, and `call_room`/`call_record` tables. ICE restart is purely client-side.

### Architecture

```
Network blip occurs (1-5s)
  → LiveKit Client SDK detects ICE transport drop
  → Room state changes to Reconnecting
  → [Client] ReconnectingBanner shown (local user only)
  → SDK initiates ICE restart (automatic, no server needed)
  
Network recovers
  → ICE restart succeeds
  → Room state changes to Connected
  → [Client] ReconnectingBanner hidden
  → Call continues with existing room + token

Partner's client
  → Sees no change (short audio dropout covered by jitter buffer)
  → No UI change, no indication of partner's reconnect

Intentional disconnect (user taps Leave)
  → onDisconnected fires normally → router.back()
  → NOT a network blip — handle separately
```

### Relevant Files

- `apps/native/app/call/[room].tsx` — Main call screen where ReconnectingBanner goes
- `apps/native/app/call/Room.tsx` — If extracted; otherwise inline in [room].tsx
- `packages/ui/src/` — For shared UI components (ReconnectingBanner could be web-only or shared)
- `apps/web/src/app/call/` — Web call screen (create if doesn't exist)
- `apps/server/src/index.ts` — Webhook handler (verify blips don't trigger room.finished)
- `packages/api/src/routers/livekit.ts` — API procedures (token refresh if needed)
