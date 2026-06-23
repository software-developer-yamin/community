---
stepsCompleted:
  - 'step-01-preflight-and-context'
  - 'step-02-generation-mode'
  - 'step-03-test-strategy'
  - 'step-04-generate-tests'
  - 'step-04c-aggregate'
  - 'step-05-validate-and-complete'
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-06-23'
storyId: '4.2'
storyKey: 'epic-004-story-042'
storyFile: '_bmad-output/implementation-artifacts/stories/epic-004-story-042.md'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-epic-004-story-042.md'
generatedTestFiles:
  - 'tests/api/moderation-skip.spec.ts'
  - 'tests/e2e/moderation-skip.spec.ts'
  - 'tests/unit/skip-tracker.spec.ts'
tddPhase: 'RED'
totalTests: 12
apiTests: 6
unitTests: 4
e2eTests: 2
fixturesCreated: 1
executionMode: 'sequential'
inputDocuments:
  - '_bmad-output/implementation-artifacts/stories/epic-004-story-042.md'
  - '_bmad-output/planning-artifacts/epics.md'
  - '_bmad-output/project-context.md'
---

# ATDD Checklist: Story 4.2 — Skip Button (In-Call Action)

## Step 1 — Preflight & Context

**Detected Stack:** fullstack (web/Next.js + server/Bun/Hono + native/Expo + oRPC + Drizzle)
**Test Framework:** Playwright (existing in `tests/`)
**Story Status:** new
**AC Count:** 4 (AC1–AC4)

### Loaded Context

- Story: Skip button for in-call — end a bad call without receiving a strike
- Key findings from codebase audit:
  - `endCall` in `livekit.ts` already handles call termination with `endReason` enum (needs `"skip"` added)
  - `shouldCountAsStrike` in `strike-logic.ts` only counts `"disconnect"` as a strike — all other reasons are exempt by design
  - `moderation.ts` router exists with `getStrikes` — can add `skipCall` here or as new router
  - No `skip-tracker.ts` exists yet — pure in-memory session tracker is greenfield
  - `callRoom` schema tracks room participants (participantA, participantB) for partner identification
  - `callRecord` table persists call end reasons — skip will write `endReason: "skip"` for skipper, `"partner_skipped"` for partner
  - Native call screen at `apps/native/app/call/[room].tsx` — target for Skip button UI
  - `matching.tsx` is post-skip destination — navigation to match queue
- Risk: rate-limit correctness, session tracking across multiple calls, partner notification on skip, 3-skip nudge threshold

## Step 2 — Generation Mode

**Mode:** AI Generation
**Reason:** Skip logic is straightforward: rate-limit + session count + partner notification. All tests can be designed from ACs + story file.

## Step 3 — Test Strategy

### Acceptance Criteria to Test Mapping

| AC | Description | P0 | P1 | Level |
|---|---|---|---|---|
| AC1 | Tap Skip ends call, returns to queue | SKIP-API-001, SKIP-E2E-001 | SKIP-API-006 | API + E2E |
| AC2 | No strike on skip | SKIP-API-002 | — | API |
| AC3 | Rate limit (1 skip / 5s) | SKIP-API-003, SKIP-UNIT-001 | SKIP-API-004 | API + Unit |
| AC4 | UX nudge after 3 skips | SKIP-API-005, SKIP-UNIT-002 | SKIP-E2E-002 | API + Unit + E2E |

### Test Levels

- **Unit tests** (Playwright/vanilla Jest): Pure-logic tests for `skip-tracker.ts` — rate limit calculation, session count, nudge threshold, reset, edge cases
- **API tests** (Playwright API): Direct calls to `moderation.skipCall` — verify skip recording, rate-limit blocking, nudge response, partner notification, strike exemption
- **E2E tests** (Playwright UI): Full flow — enter call → tap skip → verify return to queue → verify no strike

### Red Phase Strategy

All tests use `test.skip()` — they will fail until implementation. Tests target all three layers.

## Step 4 — Red-Phase Test Scaffolds

### Generated Unit Tests (`tests/unit/skip-tracker.spec.ts`) — 4 tests

| Ref | Priority | Test Name | AC |
|---|---|---|---|
| SKIP-UNIT-001 | P0 | should rate-limit skips within 5-second window | AC3 |
| SKIP-UNIT-002 | P0 | should return nudge after 3 skips in one session | AC4 |
| SKIP-UNIT-003 | P1 | should reset skip count for new session | AC4 |
| SKIP-UNIT-004 | P1 | should handle concurrent skip requests safely | AC3 |

### Generated API Tests (`tests/api/moderation-skip.spec.ts`) — 6 tests

| Ref | Priority | Test Name | AC |
|---|---|---|---|
| SKIP-API-001 | P0 | should end active call and return success on skip | AC1 |
| SKIP-API-002 | P0 | should NOT create a strike event for skip | AC2 |
| SKIP-API-003 | P0 | should reject skip within 5 seconds (rate limit) | AC3 |
| SKIP-API-004 | P1 | should allow skip after 5-second cooldown expires | AC3 |
| SKIP-API-005 | P0 | should include nudge message on 3rd skip | AC4 |
| SKIP-API-006 | P1 | should set partner endReason to "partner_skipped" | AC1 |

### Generated E2E Tests (`tests/e2e/moderation-skip.spec.ts`) — 2 tests

| Ref | Priority | Test Name | AC |
|---|---|---|---|
| SKIP-E2E-001 | P0 | full flow: enter call → tap skip → return to queue → verify no strike | AC1, AC2 |
| SKIP-E2E-002 | P1 | nudge appears on 3rd skip in a session | AC4 |

## TDD Red Phase (Current)

- Total test scaffolds: 12 (4 unit, 6 API, 2 E2E)
- All tests use `test.skip()` — red phase, expected to fail
- All tests include descriptive failure comments explaining why they will fail

## Acceptance Criteria Coverage

| AC | Test Level | Priority | Coverage |
|---|---|---|---|
| AC1: Tap Skip ends call, returns to queue | API + E2E | P0/P1 | SKIP-API-001, SKIP-API-006, SKIP-E2E-001 |
| AC2: No strike on skip | API | P0 | SKIP-API-002 |
| AC3: Rate limit (1 skip / 5s) | API + Unit | P0/P1 | SKIP-API-003, SKIP-API-004, SKIP-UNIT-001, SKIP-UNIT-004 |
| AC4: UX nudge after 3 skips | API + Unit + E2E | P0/P1 | SKIP-API-005, SKIP-UNIT-002, SKIP-UNIT-003, SKIP-E2E-002 |

## Fixtures Created

- `tests/fixtures/skip-test-data.ts` — Test user setup helpers, skip session builders, mock room data
