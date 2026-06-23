---
baseline_commit: 52cd5b2149cba38fb31e3030606042f3bea40953
---

# Story 4.1: Graduated Strike System

Status: ready-for-dev

## Story

As a Learner,
I want to receive warnings and cooldowns before being banned,
So that I understand my behavior and have a chance to correct it.

## Acceptance Criteria

1. **Warning on 3rd short disconnect** — Given I disconnect 3 short calls (<30s) in a row, When the third disconnect occurs, Then I receive a non-blocking warning: "We noticed you ended 3 calls quickly. If partners aren't a good fit, use the 'Skip' button." And no queue block is applied. (epics#L566-L569)

2. **1h cooldown on 5th short disconnect** — Given I disconnect 5 short calls in 24h, When the fifth disconnect occurs, Then I receive a 1-hour cooldown (queue-blocked, not banned) And I can still use free features and chat. (epics#L571-L574)

3. **24h cooldown on 10th short disconnect** — Given I disconnect 10 short calls in 24h, When the tenth disconnect occurs, Then I receive a 24-hour cooldown And my account is flagged for automatic human review. (epics#L576-L579)

4. **Strike decay after 30 clean days** — Given I have not disconnected a call in 30 days, When the system evaluates my strikes, Then my strike count is zero And my moderation state is clean. (epics#L581-L584)

5. **Long call (≥30s) exempt from strikes** — Given a disconnect lasts ≥30s, When it ends, Then it does not count as a strike And it is treated as a normal call end. (epics#L586-L589)

6. **Resilience** — Strike state survives server restart (DB-persisted). Concurrent strike increments are serialized per user_id to prevent double-counting. (test-design-epic-4.md#L147-L150, prd.md#NFR)

## Tasks / Subtasks

### Task 1: DB schema — Moderation tables

- [ ] 1.1 Create `packages/db/src/schema/moderation.ts` with:
  - `strikeEvent` table: id, userId, reason (enum: short_disconnect), durationSec (the call duration that triggered the strike), callRecordId (FK to call_record), createdAt
  - `moderationState` table: id, userId (unique), strikeCount (integer), state (enum: clean|warned|cooldown_1h|cooldown_24h|suspended|banned), cooldownUntil (timestamp, nullable), flaggedForReview (boolean), updatedAt, decayedAt (timestamp of last decay check)
- [ ] 1.2 Export from `packages/db/src/schema/index.ts`
- [ ] 1.3 Add `call_record_id` FK reference in `packages/db/src/schema/call.ts` (optional, for traceability)

### Task 2: Core strike logic — Pure functions

- [ ] 2.1 Create `packages/api/src/lib/strike-logic.ts` with pure functions:
  - `classifyCallDuration(durationSec: number): "short" | "normal"` — short = <30s, normal = ≥30s
  - `shouldCountAsStrike(endReason: EndReason, durationSec: number): boolean` — "disconnect" + <30s = strike; everything else = no strike
  - `determineModerationState(strikeCount24h: number, previousState: string): { state: string, cooldownUntil: Date | null, flagged: boolean }` — 0-2: clean, 3-4: warned, 5-9: cooldown_1h, 10+: cooldown_24h + flagged
  - `computeActiveStrikes24h(strikes: StrikeEvent[], now: Date): number` — count strikes within rolling 24h window
  - `shouldDecayStrikes(lastDecayCheck: Date, now: Date): boolean` — 30+ days since last decay check
  - `decayStrikes(strikes: StrikeEvent[], now: Date): StrikeEvent[]` — clear all strikes older than 30 days
- [ ] 2.2 Unit tests for strike-logic.ts covering all branches (see ATDD section)

### Task 3: API — Moderation router (strike endpoints)

- [ ] 3.1 Create `packages/api/src/routers/moderation.ts`:
  - `recordStrike` (internal/triggered by endCall): Called when a short disconnect happens. Checks current state, computes new state, upserts moderationState, inserts strikeEvent. Returns current moderationState.
  - `getMyModerationState` (protected): Returns { strikeCount, state, cooldownUntil, flaggedForReview } for the authenticated user.
  - `evaluateStrikes` (internal/cron-like or on-demand): Decay check — if 30+ days since last check, decay all strikes, update moderation state.
- [ ] 3.2 Wire into `packages/api/src/routers/index.ts` as `moderation: moderationRouter`
- [ ] 3.3 Integration — Hook strike recording into `livekitRouter.endCall` (or create a middleware) so that after a call is recorded with endReason="disconnect", the strike system evaluates whether to add a strike.

### Task 4: Queue guard — Block calls during cooldown

- [ ] 4.1 In `recommendationsRouter.matchPartners` (or whichever queue endpoint), add a pre-check: if user's moderation state is cooldown_1h or cooldown_24h and cooldownUntil > now, return a COOLDOWN error (not a generic error — include remaining time and readable message).
- [ ] 4.2 Ensure the cooldown message includes remaining time so the UI can display it: "You're on a cooldown for X more minutes."

### Task 5: Strike decay — Automatic cleanup

- [ ] 5.1 Integrate `evaluateStrikes` call into the moderation API (triggered on moderation state read, or periodic timer/cron).
- [ ] 5.2 Verify decay logic: only strikes >30 days old are cleared; recent strikes are preserved.

### Task 6: ATDD test implementation (RED phase → GREEN phase)

- [ ] 6.1 Create `tests/api/moderation-strikes.spec.ts` with API integration tests for strike recording, state queries, error handling, and boundary cases.
- [ ] 6.2 Create `tests/e2e/moderation-strikes.spec.ts` with E2E flow: simulate short disconnects → verify warning → continue → verify cooldown.
- [ ] 6.3 Create `tests/fixtures/moderation-test-constants.ts` with shared constants (thresholds, timeouts, durations).
- [ ] 6.4 Create `tests/fixtures/moderation-test-data.ts` with test user setup helpers.
- [ ] 6.5 Verify all tests pass in GREEN phase.

## Dev Notes

- **`callRecord` table already exists** at `packages/db/src/schema/call.ts` with `endedByUserId`, `endReason`, `durationSec`, `createdAt`. Strike system reads from this table.
- **`endCall` endpoint** in `packages/api/src/routers/livekit.ts` already records call duration and end reason. Strike recording should trigger after `endCall` completes, not replace it.
- **Strike state must survive server restart** — always DB-persisted, never in-memory only.
- **Concurrent strike events** — use DB-level serialization per user_id (`SELECT ... FOR UPDATE` or Drizzle transaction with row lock) to prevent double-counting a single disconnect.
- **Time dependency** — strike decay (30 days) and cooldowns (1h, 24h) require the system to evaluate against wall clock. Use `new Date()` server-side, not client-supplied timestamps.
- **No UI changes** in this story — this is pure backend. The frontend integration (showing warnings, cooldown messages) is Story 4.4 (Visible Moderation State).
- **Skip button** (Story 4.2) is a separate in-call action that does NOT count as a strike and is handled independently.
- **Victim/aggressor distinction** (Story 4.3) — the strike system should be designed so that a strike can be voided retroactively when a report is filed within 60s. Optionally, the `strikeEvent` table can have a `voided` boolean column added in Story 4.3.
- **Ultracite enforced**: Run `pnpm dlx ultracite fix` before committing. No `console.log`, no `as any`, no `@ts-ignore`.

### Project Structure Notes

- `packages/db/src/schema/moderation.ts` — NEW: strike events + moderation state tables
- `packages/api/src/lib/strike-logic.ts` — NEW: pure strike state machine functions
- `packages/api/src/routers/moderation.ts` — NEW: moderation API endpoints
- `packages/api/src/routers/livekit.ts` — MODIFY: hook strike recording into endCall
- `packages/api/src/routers/recommendations.ts` — MODIFY: add cooldown guard in match queue
- `packages/db/src/schema/index.ts` — MODIFY: export moderation schema
- `tests/api/moderation-strikes.spec.ts` — NEW: integration tests
- `tests/e2e/moderation-strikes.spec.ts` — NEW: E2E tests
- `tests/fixtures/moderation-test-constants.ts` — NEW: test constants
- `tests/fixtures/moderation-test-data.ts` — NEW: test data helpers

### References

- [PRD FR-11] `_bmad-output/planning-artifacts/prds/prd-community-2026-06-09/prd.md#L257-L268` — graduated strike system spec
- [PRD FR-12] `_bmad-output/planning-artifacts/prds/prd-community-2026-06-09/prd.md#L270-L274` — victim/aggressor (strike voiding context)
- [Epic 4 Story 4.1] `_bmad-output/planning-artifacts/epics.md#L556-L589` — full ACs and story definition
- [Test Design Epic 4] `_bmad-output/implementation-artifacts/epic-004-test-design.md` — full test strategy, risk assessment, scenarios
- [Architecture: Moderation] `_bmad-output/planning-artifacts/architecture.md` — service boundaries, schema design, state machine
- [Existing call-record schema] `packages/db/src/schema/call.ts` — callRecord table
- [Existing livekit router] `packages/api/src/routers/livekit.ts` — endCall endpoint (strike trigger point)
- [Existing recommendations router] `packages/api/src/routers/recommendations.ts` — match queue (cooldown guard point)
- [Ultracite coding standards] `AGENTS.md` — type safety, no `as any`, no console.log, Biome linting

### ATDD Artifacts

- **Checklist**: `_bmad-output/test-artifacts/atdd-checklist-epic-004-story-041.md`
- **API tests**: `tests/api/moderation-strikes.spec.ts`
- **E2E tests**: `tests/e2e/moderation-strikes.spec.ts`
- **Fixtures**: `tests/fixtures/moderation-test-constants.ts`, `tests/fixtures/moderation-test-data.ts`
- **TDD Phase**: RED — tests will be `test.skip()` until feature is implemented
- **Execution mode**: sequential (no subagent capability in session)

## Dev Agent Record

### Agent Model Used

Sisyphus (deepseek-v4-flash-free) via OpenCode

### Debug Log References

- Initial exploration: read call schema, livekit router, recommendations router, PRD FR-11..FR-13, architecture doc, epics.md Story 4.1, existing story format
- Key finding: `callRecord` table already has `durationSec` and `endReason` — strike system reads from existing call data rather than duplicating tracking
- Key finding: no moderation schema exists yet — all tables are greenfield
- Key finding: `endCall` in livekit router is the trigger point; strike evaluation happens after the call is recorded

### Completion Notes List

- Story 4.1 covers FR-11 fully (items 1-6 in ACs)
- Task breakdown: 6 tasks covering schema → core logic → API → queue guard → decay → test verification
- Pure strike logic extracted as `strike-logic.ts` for independent unit-testability
- Strike event recording hooks into existing `endCall` flow — minimal coupling
- Cooldown guard added to match queue as a pre-check, not scattered through the codebase
- Design anticipates Story 4.3 (strike voiding) with optional `voided` column on `strikeEvent`
- No UI changes in this story — pure backend; UI integration is Story 4.4
- Strike decay is 30-day lookback, evaluated on read (not a background cron), keeping it simple

### File List

- `_bmad-output/implementation-artifacts/stories/epic-004-story-041.md` (this file)
- `packages/db/src/schema/moderation.ts` — NEW: strikeEvent + moderationState tables
- `packages/db/src/schema/index.ts` — MODIFY: export moderation schema
- `packages/api/src/lib/strike-logic.ts` — NEW: pure strike state machine
- `packages/api/src/routers/moderation.ts` — NEW: moderation API endpoints
- `packages/api/src/routers/livekit.ts` — MODIFY: hook strike recording into endCall
- `packages/api/src/routers/recommendations.ts` — MODIFY: add cooldown guard
- `packages/api/src/routers/index.ts` — MODIFY: wire moderation router
- `tests/api/moderation-strikes.spec.ts` — NEW: API integration tests
- `tests/e2e/moderation-strikes.spec.ts` — NEW: E2E tests
- `tests/fixtures/moderation-test-constants.ts` — NEW: test constants
- `tests/fixtures/moderation-test-data.ts` — NEW: test data helpers
