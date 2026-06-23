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
storyId: '4.1'
storyKey: 'epic-004-story-041'
storyFile: '_bmad-output/implementation-artifacts/stories/epic-004-story-041.md'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-epic-004-story-041.md'
generatedTestFiles:
  - 'tests/api/moderation-strikes.spec.ts'
  - 'tests/e2e/moderation-strikes.spec.ts'
tddPhase: 'RED'
totalTests: 16
apiTests: 12
e2eTests: 4
fixturesCreated: 2
executionMode: 'sequential'
inputDocuments:
  - '_bmad-output/implementation-artifacts/stories/epic-004-story-041.md'
  - '_bmad-output/implementation-artifacts/epic-004-test-design.md'
  - '_bmad-output/planning-artifacts/epics.md'
  - '_bmad-output/project-context.md'
---

# ATDD Checklist: Story 4.1 — Graduated Strike System

## Step 1 — Preflight & Context

**Detected Stack:** fullstack (web/Next.js + server/Bun/Hono + native/Expo)
**Test Framework:** Playwright (existing in `tests/`)
**Story Status:** new
**AC Count:** 6 (AC1-AC6)

### Loaded Context

- Story: Graduated Strike System — users who disconnect repeated short calls receive a graduated response (warn → cooldown_1h → cooldown_24h) rather than instant ban
- Key findings from codebase audit:
  - `callRecord` table exists with `durationSec`, `endReason`, `endedByUserId`, `createdAt` — strike system reads from this
  - `endCall` in `livekitRouter` already records call-end events with reason and duration
  - No moderation schema exists yet — all tables/strikes are greenfield
  - Strike state machine is pure logic — extractable as `strike-logic.ts`
  - Time manipulation needed for decay (30 days) and cooldowns (1h, 24h)
- Risk: state machine correctness (wrong state transitions), concurrent strikes, decay accuracy, ≥30s exemption

## Step 2 — Generation Mode

**Mode:** AI Generation
**Reason:** Strike state machine is logic-heavy with clear state transitions. All tests can be designed from ACs + test design doc.

## Step 3 — Test Strategy

### Acceptance Criteria to Test Mapping

| AC | Description | P0 | P1 | Level |
|---|---|---|---|---|
| AC1 | Warning on 3rd short disconnect | API-001, API-002 | — | API + E2E |
| AC2 | 1h cooldown on 5th short disconnect | API-003, API-004 | — | API + E2E |
| AC3 | 24h cooldown on 10th short disconnect | API-005 | — | API |
| AC4 | Strike decay after 30 clean days | API-006 | API-007 | API |
| AC5 | Long call (≥30s) exempt from strikes | API-008 | API-009 | API |
| AC6 | Resilience (DB persist, concurrent safety) | API-010 | API-011, API-012 | API |

### Test Levels

- **API tests** (Playwright API): Direct calls to moderation endpoints — verify strike recording, state queries, decay, cooldown guard
- **E2E tests** (Playwright UI): Full flow — simulate disconnects → verify warning → continue → verify cooldown

### Red Phase Strategy

All tests use `test.skip()` — they will fail until implementation. Tests target both API layer (core logic) and E2E (full flow).

## Step 4 — Red-Phase Test Scaffolds

### Generated API Tests (`tests/api/moderation-strikes.spec.ts`) — 12 tests

| Ref | Priority | Test Name | AC |
|---|---|---|---|
| API-001 | P0 | should warn user on 3rd short disconnect | AC1 |
| API-002 | P0 | should return current strike count and state | AC1 |
| API-003 | P0 | should apply 1h cooldown on 5th short disconnect | AC2 |
| API-004 | P1 | should block queue during 1h cooldown | AC2 |
| API-005 | P0 | should apply 24h cooldown + flag for review on 10th short disconnect | AC3 |
| API-006 | P0 | should clear strikes after 30 clean days | AC4 |
| API-007 | P1 | should not decay strikes before 30 days | AC4 |
| API-008 | P0 | should NOT count calls ≥30s as strikes | AC5 |
| API-009 | P1 | should NOT count non-disconnect endReasons as strikes | AC5 |
| API-010 | P0 | should persist strike state across simulated restart | AC6 |
| API-011 | P1 | should reject unauthenticated strike queries | AC6 |
| API-012 | P1 | should serialize concurrent strike increments per user | AC6 |

### Generated E2E Tests (`tests/e2e/moderation-strikes.spec.ts`) — 4 tests

| Ref | Priority | Test Name | AC |
|---|---|---|---|
| E2E-001 | P0 | warns user on 3rd disconnect then allows continued matching | AC1 |
| E2E-002 | P0 | applies 1h cooldown after 5 disconnects and blocks queue | AC2 |
| E2E-003 | P1 | long call (≥30s) does not trigger strike | AC5 |
| E2E-004 | P1 | mixed short and long calls count correctly | AC1, AC5 |

## TDD Red Phase (Current)

- Total test scaffolds: 16 (12 API, 4 E2E)
- All tests use `test.skip()` — red phase, expected to fail
- All tests include descriptive failure comments explaining why they will fail

## Acceptance Criteria Coverage

| AC | Test Level | Priority | Coverage |
|---|---|---|---|
| AC1: Warning on 3rd short disconnect | API + E2E | P0/P1 | API-001, API-002, E2E-001, E2E-004 |
| AC2: 1h cooldown on 5th short disconnect | API + E2E | P0/P1 | API-003, API-004, E2E-002 |
| AC3: 24h cooldown + flag for review | API | P0 | API-005 |
| AC4: Strike decay after 30 clean days | API | P0/P1 | API-006, API-007 |
| AC5: Long call (≥30s) exempt | API + E2E | P0/P1 | API-008, API-009, E2E-003 |
| AC6: Resilience | API | P0/P1 | API-010, API-011, API-012 |

## Fixtures Created

- `tests/fixtures/moderation-test-constants.ts` — Strike thresholds, timeouts, durations
- `tests/fixtures/moderation-test-data.ts` — Test user setup helpers, strike event builders
