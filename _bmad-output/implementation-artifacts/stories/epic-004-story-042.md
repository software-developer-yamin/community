---
baseline_commit: 1acb4c8a7b27f37e0d77892c890272fb5267e23e
---

# Story 4.2: Skip Button (In-Call Action)

Status: ready-for-dev

## Story

As a Learner,
I want to end a bad call and find a new partner without receiving a strike,
So that I have a safe way to reject a mismatch.

## Acceptance Criteria

1. **Tap Skip ends call** — Given I am in an active call, When I tap the "Skip" button, Then the call ends immediately, And I see "Finding a new partner...", And I return to the match queue within 3 seconds. (epics.md#L601-L605)

2. **No strike on skip** — Given I skip a call, When the action completes, Then the skip does not increment my strike counter, And the skipped partner sees "Call ended by partner". (epics.md#L607-L611)

3. **Rate limit (1 skip / 5s)** — Given I skip multiple times rapidly, When I attempt more than 1 skip per 5 seconds, Then the skip button is temporarily disabled, And a message shows: "Please wait before skipping again". (epics.md#L613-L616)

4. **UX nudge after 3 skips** — Given I skip 3 times in a single session, When the third skip occurs, Then I see: "We notice you're skipping partners. Try adjusting your filters or come back later.", And this is a UX nudge, not a strike. (epics.md#L618-L621)

## Tasks / Subtasks

### Task 1: Backend — Skip endpoint in moderation router

- [ ] 1.1 Add `skipCall` procedure to `packages/api/src/routers/moderation.ts`:
  - Input: `{ roomName: string }`
  - Fetches the current call record for the user in the specified room
  - Ends the call via LiveKit room service (close room)
  - Records call end with `endReason = "skip"` — NOT counted as a strike
  - Returns `{ success: true, nudge?: string }`
  - If skip count in session >= 3, returns the UX nudge message
- [ ] 1.2 Session-level skip tracking:
  - Track skip count per user session (in-memory Map with userId → { count, timestamps[] })
  - Reset skip count when a new call begins
  - After 3 skips in a session, include nudge message in response
- [ ] 1.3 Rate limiting:
  - Check last skip timestamp; if < 5s, return rate-limit error
  - Use server-side timestamp, not client-supplied
- [ ] 1.4 Partner notification:
  - When skip is recorded, mark the partner's call record end reason as "partner_skipped"
- [ ] 1.5 Wire into `packages/api/src/routers/index.ts` (already wired from Story 4.1)

### Task 2: Frontend — Skip button on call screen

- [ ] 2.1 Add Skip button to `apps/native/app/call/[room].tsx`:
  - Styled as a secondary/outline button (not the primary end-call button)
  - Positioned prominently in the call UI
  - Label: "Skip" with an icon (forward/next arrow)
- [ ] 2.2 Button states:
  - **Default**: Visible, tappable
  - **Cooldown (5s)**: Disabled, shows countdown "Wait 3s..."
  - **After tap**: Shows "Finding a new partner..." overlay/spinner, navigates to matching screen
- [ ] 2.3 Call the `moderation.skipCall` API when Skip is tapped:
  - Pass `roomName` from current call context
  - Handle rate-limit error (show "Please wait before skipping again")
  - Handle nudge response (show "We notice you're skipping..." modal)
- [ ] 2.4 Navigation:
  - After successful skip, navigate to matching/queue screen
  - Clear the current call state

### Task 3: Backend — Session skip tracking

- [ ] 3.1 Create `packages/api/src/lib/skip-tracker.ts`:
  - In-memory store mapping userId → { count, lastSkipAt, timestamps[] }
  - `recordSkip(userId: string): { count: number, isRateLimited: boolean, showNudge: boolean }`
  - `resetSkipCount(userId: string): void` — called when a new call starts
  - `getSkipCount(userId: string): number`
- [ ] 3.2 Wire into `moderation.skipCall`:
  - Call `recordSkip` on each skip
  - If `isRateLimited`, return error (HTTP 429 style)
  - If `showNudge`, include nudge message in response
- [ ] 3.3 Call `resetSkipCount` when a new call is initiated (in `livekit.createRoom` or equivalent)

### Task 4: Tests

- [ ] 4.1 Create unit tests for `skip-tracker.ts` covering: rate limiting, session counting, reset, edge cases (100+ skips)
- [ ] 4.2 Create API integration tests for `moderation.skipCall` covering: success, rate limit, nudge after 3, partner notification
- [ ] 4.3 Create E2E test for skip flow: enter call → tap skip → verify return to queue → verify no strike
- [ ] 4.4 Verify all tests pass

## Dev Notes

- **Strike-logic already exists** — `shouldCountAsStrike` in `packages/api/src/lib/strike-logic.ts` determines whether a call end is a strike. Skip should set endReason to something that `shouldCountAsStrike` returns false for (e.g., a new `EndReason` variant `"skip"`).
- **LiveKit room service** (`roomClient`) already instantiated in `packages/api/src/routers/livekit.ts` — can be extracted to a shared module or the skip endpoint can import it.
- **Skip tracking is in-memory** — no DB persistence needed for skip counts. Session-level only. Resets when a new call starts.
- **Rate limiting is separate from strike logic** — even within the 5s cooldown, no strike is recorded. It's purely a UX rate limit.
- **No cooldown/ban interaction** — skip is always available regardless of moderation state. It's the safe escape hatch.
- **Partner sees "Call ended by partner"** — This is a display concern. The API returns `endReason = "partner_skipped"` for the partner's call record. The UI on the partner's side handles the display.

### Project Structure Notes

- `packages/api/src/routers/moderation.ts` — MODIFY: add skipCall endpoint
- `packages/api/src/lib/skip-tracker.ts` — NEW: in-memory skip session tracker
- `apps/native/app/call/[room].tsx` — MODIFY: add Skip button
- `tests/api/moderation-skip.spec.ts` — NEW: API integration tests
- `tests/e2e/moderation-skip.spec.ts` — NEW: E2E tests

### References

- [PRD FR-21] `_bmad-output/planning-artifacts/prds/prd-community-2026-06-09/prd.md` — skip button requirement
- [Epic 4 Story 4.2] `_bmad-output/planning-artifacts/epics.md#L591-L621` — full ACs and story definition
- [Existing livekit router] `packages/api/src/routers/livekit.ts` — room management, endCall
- [Existing strike-logic] `packages/api/src/lib/strike-logic.ts` — strike classification (skip must not be a strike)
- [Existing call screen] `apps/native/app/call/[room].tsx` — target for Skip button UI
- [Ultracite coding standards] `AGENTS.md` — type safety, no `as any`, no console.log, Biome linting

## Dev Agent Record

### Agent Model Used

Sisyphus (deepseek-v4-flash-free) via OpenCode

### Completion Notes

- Story 4.2 covers FR-21 fully (items 1-4 in ACs)
- Task breakdown: 4 tasks covering backend skip endpoint → frontend skip button → skip tracking → tests
- In-memory skip tracking is intentional (session-scoped, no persistence needed)
- Rate limiting is server-enforced (not client-side), with client-side UI feedback
- Skip is distinct from strike logic — always zero-strike by design
- Nudge after 3 skips is soft feedback, not a moderation action

### File List

- `_bmad-output/implementation-artifacts/stories/epic-004-story-042.md` (this file)
- `packages/api/src/routers/moderation.ts` — MODIFY: add skipCall
- `packages/api/src/lib/skip-tracker.ts` — NEW: session skip tracker
- `apps/native/app/call/[room].tsx` — MODIFY: add Skip button + states
- `tests/api/moderation-skip.spec.ts` — NEW: API tests
- `tests/e2e/moderation-skip.spec.ts` — NEW: E2E tests
