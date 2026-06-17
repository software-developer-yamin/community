---
baseline_commit: 81cc3c8205585c1852037ba57f59796698e7daa4
---

# Story 2.1: Server-Managed Room Lifecycle

Status: in-progress

## Story

As a Learner,
I want the system to create, manage, and clean up my call rooms,
So that I don't have to worry about room management or stale connections.

## Acceptance Criteria

1. **Match-based room creation** — Given a match is found, When the system creates a room, Then the room is named `call-{matchId}` and both participants receive a join token. (epics#L352-L355)
2. **Auto-cleanup on disconnect** — Given both participants disconnect, When 30 seconds pass, Then the room is automatically closed and all resources are cleaned up. (epics#L357-L360)
3. **Explicit call end tracking** — Given a call is explicitly ended, When the end call action is triggered, Then the room is closed within 30 seconds and a call record is saved with end reason. (epics#L362-L365)
4. **No room reuse** — Given a room exists, When it is reused across matches, Then the system prevents reuse and each match gets a fresh room. (epics#L367-L370)
5. **LiveKit webhook integration** — The server listens for `room.finished` and `participant_disconnected` webhooks from LiveKit to trigger cleanup.

## Tasks / Subtasks

- [ ] Task 1: Create `call_room` and `call_record` DB tables (AC: 3, 4)
  - [ ] 1.1 `call_room` table: `id`, `matchId` (unique), `roomName`, `status` (active | ended), `createdAt`, `updatedAt`
  - [ ] 1.2 `call_record` table: `id`, `roomName`, `matchId`, `endedBy` (userId), `endReason` (disconnect | explicit | timeout), `participantCount`, `durationSec`, `createdAt`
  - [ ] 1.3 Add to Drizzle schema exports and `createDb()`
- [ ] Task 2: Match-based room auto-creation (AC: 1)
  - [ ] 2.1 Create `createCallRoom` procedure: takes `matchId`, generates `call-{matchId}`, creates room in LiveKit, inserts `call_room` row, issues join tokens for both participants
  - [ ] 2.2 Return room name + both participant tokens from the procedure
- [ ] Task 3: LiveKit webhook handler (AC: 2, 3, 5)
  - [ ] 3.1 Add webhook endpoint in server (`POST /livekit/webhook`) verifying LiveKit webhook signature
  - [ ] 3.2 Handle `room.finished` → mark room as ended, save call record with `endReason: "disconnect"` if no explicit end
  - [ ] 3.3 Handle `participant_disconnected` → track disconnect count; when both participants disconnect, schedule room cleanup within 30s
- [ ] Task 4: Explicit call end procedure (AC: 3)
  - [ ] 4.1 Create `endCall` procedure: takes `roomName`, sets `endReason`, closes the LiveKit room, updates `call_room.status = ended`, inserts `call_record`
- [ ] Task 5: Scheduled cleanup job (AC: 2, 4)
  - [ ] 5.1 Create cleanup function that finds `call_room` rows where both participants disconnected >30s ago and room is still active
  - [ ] 5.2 Close stale rooms in LiveKit and update DB
- [ ] Task 6: Room reuse prevention (AC: 4)
  - [ ] 6.1 `createCallRoom` checks for existing active room for the same matchId → reject if exists
  - [ ] 6.2 `createCallRoom` checks room name `call-{matchId}` is not in use in LiveKit
- [ ] Task 7: Verification
  - [ ] 7.1 LSP diagnostics clean on changed files
  - [ ] 7.2 Build passes (`pnpm run check-types`)

## Dev Notes

- Existing `livekit.ts` router already has `token`, `createRoom`, `closeRoom`, `listRooms` procedures. Story 2.1 adds match-aware lifecycle on top.
- `closeRoom` is currently admin-only. Need to make end-call accessible to call participants.
- `matchPartners` already exists in `models.ts` — the matching infra is set up. Story 2.1 adds room creation after a match resolves.
- LiveKit webhook secret is `LIVEKIT_WEBHOOK_SECRET` — verify in env.
- No call/room tables exist in DB yet — need to create them in `packages/db/src/schema/`.
- `room.finished` is fired by LiveKit when the last participant leaves (after a configurable empty timeout). We set this to 30s in room creation.
- `pnpm dlx ultracite fix` before committing. No `console.log`, no `as any`.

### Architecture

```
Match resolved
  → createCallRoom(matchId)
    → LiveKit: createRoom(name: "call-{matchId}", emptyTimeout: 30)
    → DB: insert call_room (status: active)
    → Generate AccessToken for participant A & B
    → Return { roomName, tokenA, tokenB }

Participant disconnects
  → LiveKit webhook: participant_disconnected
    → Track disconnect count in-memory/DB
    → If both disconnected → wait 30s → closeRoom + call_record

Explicit end call
  → Client calls endCall(roomName, reason)
    → LiveKit: deleteRoom(roomName)
    → DB: update call_room (status: ended)
    → DB: insert call_record

Room reuse prevention
  → createCallRoom checks matchId not already active
  → Creates room name call-{matchId} — unique per match
```
