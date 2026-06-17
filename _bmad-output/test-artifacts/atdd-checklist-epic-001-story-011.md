---
stepsCompleted:
  - 'step-01-preflight-and-context'
  - 'step-02-generation-mode'
  - 'step-03-test-strategy'
  - 'step-04-generate-tests'
  - 'step-04c-aggregate'
  - 'step-05-validate-and-complete'
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-06-16T04:30:00+06:00'
storyId: '1.1'
storyKey: 'epic-001-story-011'
storyFile: '_bmad-output/implementation-artifacts/stories/epic-001-story-011.md'
atddChecklistPath: '_bmad-output/test-artifacts/atdd-checklist-epic-001-story-011.md'
generatedTestFiles:
  - 'tests/api/session-persistence.spec.ts'
  - 'tests/e2e/session-persistence.spec.ts'
tddPhase: 'RED'
totalTests: 9
apiTests: 5
e2eTests: 4
fixturesCreated: 3
executionMode: 'sequential'
---

# ATDD Checklist: Story 1.1 — Persistent Session with Secure Storage

## TDD Red Phase (Current)

✅ Red-phase test scaffolds generated

- API Tests: 5 tests (all skipped with `test.skip()`)
- E2E Tests: 4 tests (all skipped with `test.skip()`)

## Acceptance Criteria Coverage

| AC | Test Level | Priority | Coverage |
|---|---|---|---|
| AC1: Native force-quit persistence | E2E | P0 | ✅ `[P0] should restore session after native force-quit without re-auth` |
| AC2: Web 7-day idle persistence | E2E | P0 | ✅ `[P0] should restore session within 7-day idle window on web` |
| AC2: Expired session redirect | E2E | P1 | ✅ `[P1] should redirect to login after session expiry beyond 7-day window` |
| AC3: Refresh token rotation | API | P0 | ✅ `[P0] should rotate refresh token and invalidate old token` |
| AC4: Cold-start performance | API | P1 | ✅ `[P1] should restore session within p95 ≤ 2500ms cold-start budget` |
| AC4: Background hydration | API | P1 | ✅ `[P1] should show skeleton/hydrate-first UI while restoring in background` |
| AC5: Auth reliability (retry) | API | P1 | ✅ `[P1] should retry session restore on network failure (exponential backoff, max 3)` |
| AC5: Graceful degradation | API | P1 | ✅ `[P1] should degrade gracefully to login when all restore attempts fail` |
| AC6: Cross-platform parity | E2E | P1 | ✅ `[P1] should achieve equivalent persistence outcome on web and native` |

## Step 1 — Preflight & Context

### Stack Detection
- Detected stack: **fullstack** (Next.js 16 web + Hono API server + Expo native)
- Test framework: **not configured** — no `playwright.config.ts`, `vitest.config.ts`, or `cypress.config.ts` found
- This will need bmad-testarch-framework setup before ATDD tests can execute

### Story Context
- **Story 1.1: Persistent Session with Secure Storage**
- 6 acceptance criteria covering native force-quit, web 7-day idle, refresh rotation, cold-start perf, auth reliability, cross-platform parity
- Key files: `packages/auth/src/index.ts`, `apps/native/lib/auth-client.ts`, `packages/db/src/schema/auth.ts`
- Better-Auth already configured with expo() plugin + SecureStore; needs session expiry, cookie refinement, rotation config

### Prerequisites Status
| Prerequisite | Status | Notes |
|---|---|---|
| Story approved with clear ACs | ✅ | 6 ACs defined in story file |
| Test framework configured | ❌ | No playwright/cypress/vitest config found |
| Development environment | ✅ | Bun, Drizzle, Expo all configured |

## Step 2 — Generation Mode
- Mode selected: **AI Generation** (ACs are clear and standard auth/session patterns; native E2E tests can't be browser-recorded)
- No manual recording steps needed

## Step 3 — Test Strategy

### AC → Test Scenario Mapping

| AC | Scenario | Test Level | Priority | Red-Phase Behavior |
|---|---|---|---|---|
| AC1: Native force-quit | Login on native → force-quit app → relaunch → verify session restored without re-auth | E2E (native) | P0 | Test expects session but none exists → fails with auth redirect |
| AC2: Web 7-day idle | Login on web → set session.expiresAt to past → refresh page → verify redirected to login after expiry, restored if within window | E2E (web) | P0 | Cookie not set → session check fails → test expects 401/home redirect |
| AC3: Refresh rotation | Auth flow → extract token → call refresh endpoint → verify old token 401, new token 200 | Integration (API) | P0 | No rotation endpoint configured → refresh returns 404/throws |
| AC4: Cold-start perf | Measure session restore time → assert p95 ≤ 2.5s | Integration | P1 | No session guard implemented → restore time is 0ms (immediate redirect to login) |
| AC5: Auth reliability | Simulate network failure on restore → verify retry + fallback to login | Integration | P1 | No retry logic → fails immediately |
| AC6: Cross-platform | Run AC1 flow on native AND AC2 flow on web → assert same persistence outcome | E2E | P1 | Both fail until implementation |

### Test Level Selection
- **E2E** (native + web): AC1, AC2, AC6 — critical user journeys for session persistence
- **Integration** (API): AC3, AC4, AC5 — token rotation, perf measurement, retry behavior
- **No Unit/Component tests** for this story — session restore is cross-cutting infrastructure, not isolated UI logic

## Step 4 — Test Generation (RED PHASE)

### Execution Mode
- **Resolved mode**: `sequential` (no subagent/agent-team capability available in session)
- **Fallback**: Config `tea_execution_mode: auto` → probed capabilities: no subagent, no agent-team → fell back to sequential

### Generated Files

| File | Type | Tests | Status |
|---|---|---|---|
| `tests/api/session-persistence.spec.ts` | API (AC3, AC4, AC5) | 5 (P0: 1, P1: 4) | 🔴 RED (all `test.skip()`) |
| `tests/e2e/session-persistence.spec.ts` | E2E (AC1, AC2, AC6) | 4 (P0: 2, P1: 2) | 🔴 RED (all `test.skip()`) |
| `tests/fixtures/test-data.ts` | Fixtures | 3 exports | ✅ Created |

### TDD Validation
- ✅ All 9 tests use `test.skip()` (TDD red phase compliant)
- ✅ All tests assert EXPECTED behavior (no placeholder assertions)
- ✅ All tests marked as `expected_to_fail`
- ✅ All test files written to disk

## Next Steps (Task-by-Task Activation)

During implementation of each task:

1. Remove `test.skip()` from the current test file or scenario
2. Run tests: `npm test`
3. Verify the activated test fails first, then passes after implementation (green phase)
4. If any activated tests still fail unexpectedly:
   - Either fix implementation (feature bug)
   - Or fix test (test bug)
5. Commit passing tests

## Implementation Guidance

### Feature endpoints to implement:
- `POST /api/auth/refresh` — refresh token rotation (AC3)
- `POST /api/auth/restore` — session restore endpoint (AC4, AC5)
- `POST /api/auth/expire-session` — test helper to expire sessions (AC2 E2E)
- Server config: `session.expiresIn: "30d"`, platform-aware `sameSite`, rotation config

### UI components to implement:
- `<SessionRestoreGuard>` — native (Expo) and web (Next.js) — shows skeleton → silent restore → redirect
- Login redirect handling for expired/invalid sessions
- Background hydration with skeleton-first rendering
- Exponential backoff retry logic (max 3, 500ms base)
