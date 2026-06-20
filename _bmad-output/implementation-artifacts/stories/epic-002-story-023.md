---
baseline_commit: 81cc3c8205585c1852037ba57f59796698e7daa4
---

# Story 2.3: Full Reconnection (5-30s Blips)

Status: ready-for-dev

## Story

As a Learner,
I want to survive longer network blips with a clear reconnection UI,
So that I know what's happening and can choose to wait or end the call.

## Acceptance Criteria

1. **10s blip, countdown visible** — Given I am in an active call, When a 10-second network blip occurs, Then the "reconnecting..." indicator remains visible And a countdown shows elapsed reconnection time.

2. **30s timeout, "connection lost" prompt** — Given a 30-second blip occurs, When the connection is not restored, Then a "connection lost" prompt appears And I can choose to retry or end the call.

3. **Retry triggers full reconnection** — Given I choose to retry, When the reconnection attempt begins, Then the system attempts a full reconnection And my partner is notified that I am reconnecting.

4. **End call with reason "connection lost"** — Given I choose to end the call, When the end action is triggered, Then the call ends with reason "connection lost" And no strike is issued for the disconnect.

5. **Grace window after 30s timeout** — Given the 30s countdown expires, When the network recovers within a 5s grace window, Then the call resumes without showing "connection lost" prompt.

6. **Token refresh during extended blip** — Given a blip exceeds 4 minutes, When the LiveKit token expires, Then the client fetches a new token before reconnecting.

7. **Retry loop capped at 3 attempts** — Given the network is dead, When the system attempts reconnection, Then retries are capped at 3 attempts with exponential backoff (2s, 4s, 8s) And after 3 failures a persistent "connection lost" prompt with manual retry button is shown.

## Tasks / Subtasks

- [ ] Task 1: Reconnection state machine with countdown
  - [ ] 1.1 Extend connection state listener from Story 2.2 to track elapsed reconnection time (5-30s range)
  - [ ] 1.2 Add countdown timer display to ReconnectingBanner: "Reconnecting... (5s)" format
  - [ ] 1.3 Implement 30s timeout logic: after 30s of continuous Reconnecting state → show "connection lost" prompt
  - [ ] 1.4 Add 5s grace window: if network recovers during 30-35s window, suppress "connection lost" prompt
  - [ ] 1.5 Debounce state transitions to prevent false "connection lost" on brief glitches

- [ ] Task 2: Connection lost prompt (retry/end)
  - [ ] 2.1 Create ConnectionLostPrompt component: "Connection lost" heading, elapsed time, retry button, end call button
  - [ ] 2.2 Implement retry flow: triggers room.reconnect() or full reconnection sequence
  - [ ] 2.3 Implement end call flow: calls endCall with reason "connection_lost"
  - [ ] 2.4 Style per UX-DR10: attention without alarm, clear call-to-action

- [ ] Task 3: Partner notification
  - [ ] 3.1 When a client enters Reconnecting state for >10s, notify partner via LiveKit data channel or server event
  - [ ] 3.2 Partner sees "Partner is reconnecting..." indicator (subtle, no alarm)
  - [ ] 3.3 Partner client does NOT trigger end-call flow on reconnection notification

- [ ] Task 4: Token refresh for extended blips
  - [ ] 4.1 Add server procedure `refreshLiveKitToken` in `packages/api/src/routers/livekit.ts`
  - [ ] 4.2 Client requests new token when connection has been in Reconnecting state for >4min
  - [ ] 4.3 Wire token refresh into reconnection flow before room.reconnect()

- [ ] Task 5: Retry loop with exponential backoff
  - [ ] 5.1 Implement retry state: max 3 attempts, backoff 2s → 4s → 8s
  - [ ] 5.2 After 3 failures, show persistent "connection lost" with manual retry button only
  - [ ] 5.3 Manual retry resets retry counter and re-enters reconnection flow

- [ ] Task 6: Verification
  - [ ] 6.1 LSP diagnostics clean on changed files
  - [ ] 6.2 Build passes (`pnpm check-types`)
  - [ ] 6.3 `pnpm dlx ultracite fix` run
  - [ ] 6.4 No `console.log`, no `as any`

## Dev Notes

- Story 2.2 established ICE restart for 1-5s blips. Story 2.3 handles the fallback when ICE restart fails or blips exceed 5s.
- The Room object from `livekit-client` provides `Room.Event.Reconnecting` and `Room.Event.Disconnected`. Use elapsed time in Reconnecting state to drive the countdown and timeout logic.
- The 5s grace window (AC5) prevents false "connection lost" when network flickers at the timeout boundary. Check `room.state === RoomState.Reconnected` before showing prompt.
- Token refresh (AC6): LiveKit tokens have 5min TTL. For blips >4min, the token may expire before network returns. Add server procedure + client-side token fetch during reconnection.
- Retry cap (AC7): Prevent infinite retry loop with max 3 attempts and backoff. After 3rd failure, only manual retry is allowed (resets counter).
- Partner notification (AC3): Use LiveKit's data channel to send a "reconnecting" message, or a server-side participant metadata update. Partner shows subtle indicator but never navigates away.
- The `onDisconnected` callback currently calls `router.back()` — this must be gated: only fire for intentional disconnect, not network blip disconnect.

### Architecture

```
Blip >5s (ICE restart fails or blip exceeds 5s)
  → Room state remains Reconnecting
  → ReconnectingBanner shows elapsed countdown: "Reconnecting... (5s)"
  
  0-30s: Network may recover → call resumes, banner hides
  → 30s reached: Show ConnectionLostPrompt (retry / end)
  
  30-35s grace window: Network recovers → suppress prompt, resume call
  → >35s: Prompt is final

User taps Retry:
  → Reconnection attempt with backoff (2s, 4s, 8s)
  → Partner notified "Partner is reconnecting..."
  → Success → banner hides, call continues
  → Fail (max 3) → persistent "connection lost" with manual retry

User taps End Call:
  → endCall(reason: "connection_lost")
  → No strike issued
  → Call ended screen with reason "connection lost"

Token refresh:
  If reconnecting >4min → fetch new LiveKit token → retry with fresh token
```

### Relevant Files

- `apps/native/app/call/[room].tsx` — Main call screen (extend ReconnectingBanner with countdown, add ConnectionLostPrompt)
- `apps/web/src/app/call/page.tsx` (or equivalent) — Web call screen matching changes
- `packages/ui/src/` — Shared components: ReconnectingBanner (extended), ConnectionLostPrompt, ConnectionLostScreen
- `packages/api/src/routers/livekit.ts` — Token refresh procedure
- `apps/server/src/index.ts` — Webhook handler (verify blips don't trigger room.finished)
- `apps/server/src/livekit/webhook.ts` — Webhook event processing
- `packages/db/src/schema/call-record.ts` — end_reason field for connection_lost
