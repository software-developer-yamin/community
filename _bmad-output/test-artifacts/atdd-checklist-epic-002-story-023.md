---
stepsCompleted:
  - 'step-01-preflight-and-context'
  - 'step-02-generation-mode'
  - 'step-03-test-strategy'
  - 'step-04-generate-tests'
  - 'step-04c-aggregate'
  - 'step-05-validate-and-complete'
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-06-20'
storyId: '2.3'
storyKey: 'epic-002-story-023'
storyFile: '_bmad-output/implementation-artifacts/stories/epic-002-story-023.md'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-epic-002-story-023.md'
generatedTestFiles:
  - 'tests/api/reconnection.spec.ts'
  - 'tests/e2e/reconnection.spec.ts'
tddPhase: 'RED'
totalTests: 23
apiTests: 15
e2eTests: 8
fixturesCreated: 0
executionMode: 'sequential'
inputDocuments:
  - '_bmad-output/implementation-artifacts/stories/epic-002-story-023.md'
  - '_bmad-output/test-artifacts/test-design-epic-2.md'
  - '_bmad-output/planning-artifacts/epics.md'
  - '_bmad-output/planning-artifacts/architecture.md'
  - '_bmad-output/project-context.md'
  - '_bmad/tea/config.yaml'
---

# ATDD Checklist: Story 2.3 — Full Reconnection (5-30s Blips)

## Step 1 — Preflight & Context

**Detected Stack:** fullstack (web/Next.js + server/Bun/Hono + native/Expo)
**Test Framework:** Playwright (existing in `tests/`)
**Story Status:** ready-for-dev
**AC Count:** 7 (AC1-AC7)

### Loaded Context

- Story: Full reconnection for 5-30s blips, extending ICE restart from Story 2.2
- Test design: 21 integration tests, 2 component, 1 unit, 4 E2E, 1 perf for Story 2.3
- Risk: R2.3-A (timeout race, score 9), R2.3-B (token expiry, score 9), R2.3-C/D/E (scores 6/4/4)

## Step 2 — Generation Mode

**Mode:** AI Generation
**Reason:** LiveKit WebRTC realtime features cannot use browser recording for reconnection behavior. All test scaffolds generated from AC analysis and test design.

## Step 3 — Test Strategy

### Acceptance Criteria to Test Mapping

| AC | Description | P0 | P1 | Level |
|---|---|---|---|---|
| AC1 | 10s blip, countdown visible | INT-001, INT-002 | — | Integration |
| AC2 | 30s timeout, "connection lost" prompt | INT-003, INT-004 | — | Integration |
| AC3 | Retry, full reconnection, partner notified | INT-005, INT-009 | INT-012, INT-017 | Integration |
| AC4 | End call with reason "connection lost", no strike | API-003, API-004 | — | API/Integration |
| AC5 | Grace window after 30s timeout | INT-006 | — | Integration |
| AC6 | Token refresh during extended blip | API-001 | — | API/Integration |
| AC7 | Retry loop capped at 3 attempts | INT-008 | INT-016 | Integration |

### Test Levels

- **Integration tests** (Playwright API): Network disruption simulation, LiveKit room state, reconnection flows
- **API tests** (Playwright API): Token refresh endpoint, end-reason recording, strike suppression
- **E2E tests** (Playwright browser): Full reconnection cycle visible in UI (when call screen exists)

### Red Phase Strategy

All tests use `test.skip()` — they will fail until implementation. Network simulation uses context-level offline/online toggling.

## Step 4 — Red-Phase Test Scaffolds

### Generated API Tests (`tests/api/reconnection.spec.ts`) — 15 tests

| Ref | Priority | Test Name | AC |
|---|---|---|---|
| API-001 | P0 | should end call with reason 'connection_lost' when timeout reached | AC4 |
| API-002 | P0 | should NOT issue a strike when end reason is 'connection_lost' | AC4 |
| API-003 | P0 | should end call with explicit reason on user tap 'End Call' during reconnection | AC4 |
| API-004 | P0 | should refresh LiveKit token for active room after extended blip | AC6 |
| API-005 | P0 | should reject token refresh for non-existent room | AC6 |
| API-006 | P1 | should reject token refresh for expired/inactive room | AC6 |
| API-007 | P0 | should suppress 'connection lost' prompt if network recovers within 5s grace window | AC5 |
| API-008 | P1 | should show 'connection lost' prompt if network remains down after grace window | AC5 |
| API-009 | P0 | should cap reconnection retries at 3 attempts with exponential backoff | AC7 |
| API-010 | P1 | should reset retry counter after manual retry | AC7 |
| API-011 | P1 | should enforce exponential backoff delays (2s, 4s, 8s) | AC7 |
| API-012 | P1 | should notify partner when user enters reconnecting state for >10s | AC3 |
| API-013 | P1 | should NOT notify partner for brief blips under 10s | AC3 |
| API-014 | P1 | should maintain correct state: active → reconnecting → active (recovery) | AC3 |
| API-015 | P1 | should maintain correct state: reconnecting → connection_lost → ended | AC3 |
| API-016 | P1 | should reject invalid state transition: active → connection_lost | AC3 |

### Generated E2E Tests (`tests/e2e/reconnection.spec.ts`) — 8 tests

| Ref | Priority | Test Name | AC |
|---|---|---|---|
| E2E-001 | P0 | should show reconnecting banner with countdown on 10s blip | AC1 |
| E2E-002 | P0 | should hide reconnecting banner and resume call when network recovers | AC1, AC2 |
| E2E-003 | P0 | should show 'connection lost' prompt after 30s of network loss | AC2 |
| E2E-004 | P0 | should attempt reconnection when user taps retry button | AC3 |
| E2E-005 | P0 | should end call with 'connection lost' reason when user taps end | AC4 |
| E2E-006 | P0 | should NOT show 'connection lost' if network recovers within 5s grace window | AC5 |
| E2E-007 | P1 | should show partner reconnecting indicator after 10s+ blip | AC3 |
| E2E-008 | P1 | should NOT end call on partner side when user reconnects | AC3 |

## TDD Red Phase (Current)

- Total test scaffolds: 23 (15 API + 8 E2E)
- All tests use `test.skip()` — red phase, expected to fail
- All tests include descriptive failure comments explaining why they will fail

## Acceptance Criteria Coverage

| AC | Test Level | Priority | Coverage |
|---|---|---|---|
| AC1: 10s blip, countdown | E2E | P0 | E2E-001 |
| AC2: 30s timeout, prompt | E2E | P0 | E2E-003 |
| AC3: Retry + partner notify | API, E2E | P0/P1 | API-012-016, E2E-004, E2E-007-008 |
| AC4: End + no strike | API | P0 | API-001-003 |
| AC5: Grace window | API, E2E | P0 | API-007-008, E2E-006 |
| AC6: Token refresh | API | P0 | API-004-006 |
| AC7: Retry cap | API | P0 | API-009-011 |

## Fixtures Created

None yet — test data is defined inline. Shared fixtures can be extracted during green phase.
