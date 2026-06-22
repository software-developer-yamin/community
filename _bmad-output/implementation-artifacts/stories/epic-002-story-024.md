---
baseline_commit: e374cad
---

# Story 2.4: Explicit Call End

Status: in-progress

## Story

As a Learner,
I want to always see a clear "Call ended" screen with a reason,
So that I understand why the call ended and whether it was my choice, my partner's, or a network issue.

## Acceptance Criteria

1. **Self-ended call** — Given I end the call, When I tap "End Call", Then I see "Call ended — you ended the call" And a post-call rating prompt appears (placeholder for Epic 7).

2. **Partner-ended call** — Given my partner ends the call, When the call ends, Then I see "Call ended — your partner ended the call" And a 10-second "waiting..." window appears before the screen.

3. **Connection lost** — Given the connection is lost, When the call ends, Then I see "Call ended — connection lost" And "connection lost" is never labeled as "your partner left".

4. **Post-end options** — Given the call ends, When the end screen appears, Then I have options to rejoin the queue, report an issue, or return home.

5. **End reason propagation** — Given a call ends for any reason, When the server records the end event, Then the correct `end_reason` variant is stored in `call_record`.

6. **Partner disconnect detection** — Given my partner disconnects from the room, When the server detects participant departure, Then the remaining participant is notified of the reason via participant metadata or data channel.

## Tasks / Subtasks

- [x] Task 1: Add `partner_ended` end reason to schema and server
  - [x] 1.1 Add `partner_ended` to the `end_reason` enum in `packages/db/src/schema/call.ts`
  - [x] 1.2 Add `partner_ended` to the `endCall` input validator enum in `packages/api/src/routers/livekit.ts`
  - [x] 1.3 Generate and apply DB migration for the new enum value

- [x] Task 2: Server-side partner disconnect notification
  - [x] 2.1 Add `notifyPartnerEndReason` procedure to livekit router — when a user calls `endCall`, update the remaining partner's participant metadata with `{ callEndReason: "partner_ended" }`
  - [x] 2.2 Wire `endCall` to call `notifyPartnerEndReason` before deleting the room (the room must still exist for metadata updates)
  - [x] 2.3 Add a brief delay (500ms) between metadata update and room deletion to ensure partner receives the notification

- [x] Task 3: Client-side partner end detection
  - [x] 3.1 In `RoomView`, listen for `RoomEvent.ParticipantDisconnected` — when partner leaves, check participant metadata for `callEndReason`
  - [x] 3.2 If `callEndReason === "partner_ended"` → navigate to `ended?reason=partner_ended`
  - [x] 3.3 If no `callEndReason` metadata → navigate to `ended?reason=connection_lost` (network issue, not intentional)
  - [x] 3.4 Add a 10-second delay before showing the ended screen when partner ends (AC2: "waiting..." window) — show "Your partner ended the call. Returning to lobby..." countdown

- [x] Task 4: Enhanced call ended screen
  - [x] 4.1 Update `END_REASON_MESSAGES` in `ended.tsx` to include `partner_ended: "Your partner ended the call."`
  - [x] 4.2 Add "Rejoin queue" button that navigates to `call/lobby`
  - [x] 4.3 Add "Report an issue" button (placeholder — opens a toast/alert "Coming in a future update")
  - [x] 4.4 Add "Return home" button that navigates to `/` (home tab)
  - [x] 4.5 Add post-call rating placeholder: show "Rate your partner" section with disabled 1-5 star UI and "Coming soon" label (Epic 7 will implement)
  - [x] 4.6 Style per UX-DR: elevated background, foreground text, lg radius for the card, md radius for buttons

- [ ] Task 5: Update ControlsBar "End Call" flow
  - [ ] 5.1 Rename "Leave" button to "End Call" (text + semantics)
  - [ ] 5.2 When user taps "End Call": call `endCall` with `endReason: "explicit"`, then navigate to `ended?reason=explicit`
  - [ ] 5.3 The server `endCall` procedure notifies the partner (Task 2) before room cleanup

- [ ] Task 6: Verification
  - [ ] 6.1 LSP diagnostics clean on changed files
  - [ ] 6.2 Build passes (`pnpm check-types`)
  - [ ] 6.3 `pnpm dlx ultracite fix` run
  - [ ] 6.4 No `console.log` (except warn), no `as any`

## Dev Notes

- Story 2.2/2.3 established the reconnection flow. Story 2.4 focuses on the **end state** — ensuring every call termination is clearly communicated and never ambiguous.

- **The "Leave" button must become "End Call"** — the current UX says "Leave" which is ambiguous. The AC requires "End Call" with a clear reason propagation.

- **Partner end detection is the core challenge.** When user A taps "End Call", we need to:
  1. Call `endCall` on server (which updates partner metadata with reason)
  2. Wait 500ms for metadata to propagate
  3. Delete the LiveKit room
  4. User A navigates to ended screen immediately
  5. User B detects `ParticipantDisconnected` + reads metadata → navigates to ended screen with `partner_ended` reason

- **The 10-second waiting window (AC2)** when partner ends: show a brief countdown "Your partner ended the call. Returning to lobby in 10s..." before showing the full ended screen. This prevents jarring instant transitions.

- **"Connection lost" must NEVER say "your partner left"** (AC3). The distinction matters: network issues → "connection lost", intentional partner end → "your partner ended the call".

- **Post-call rating is a placeholder** for Epic 7. Show the UI skeleton (disabled stars) so the screen layout is ready, but no functionality.

### Architecture

```
User A taps "End Call":
  → Client calls endCall(roomName, endReason: "explicit")
  → Server updates partner B metadata: { callEndReason: "partner_ended" }
  → Server waits 500ms
  → Server deletes LiveKit room + records callRecord
  → User A sees: "Call ended — you ended the call"

User B receives ParticipantDisconnected event:
  → Reads participant metadata for callEndReason
  → "partner_ended" → 10s waiting countdown → "Call ended — your partner ended the call"
  → No metadata → "Call ended — connection lost"

Connection lost (network):
  → Story 2.3 connection_lost flow triggers
  → User taps "End Call" from ConnectionLostBanner
  → endCall(endReason: "connection_lost")
  → "Call ended — connection lost"
```

### Relevant Files

- `apps/native/app/call/[room].tsx` — RoomView: add ParticipantDisconnected listener, update ControlsBar ("End Call"), partner end detection
- `apps/native/app/call/ended.tsx` — Enhanced ended screen: new reasons, rejoin/report/home buttons, rating placeholder
- `packages/api/src/routers/livekit.ts` — `endCall`: add partner metadata notification before room deletion
- `packages/db/src/schema/call.ts` — Add `partner_ended` to end_reason enum
- `packages/api/src/validators/livekit.ts` — Update EndCall input validator

### Previous Story Intelligence

From Story 2.3:
- ReconnectingBanner and ConnectionLostBanner are already in `[room].tsx`
- `handleEndCall` already navigates to `ended?reason=connection_lost`
- The `endCall` server procedure is fully wired and works
- Token refresh and retry flows are implemented
- Partner metadata updates work via `updateParticipantStatus`
- The `RoomEvent.ParticipantMetadata` listener is already in place — can be extended for `callEndReason`

### What Must Be Preserved

- All reconnection logic from Stories 2.2/2.3 must continue working
- The `handleRetry` flow in ConnectionLostBanner must still work
- Partner reconnecting indicators must still display
- Token refresh during extended blips must still work
- The `endCall` server procedure's existing flow (room cleanup, callRecord insert) must not break
