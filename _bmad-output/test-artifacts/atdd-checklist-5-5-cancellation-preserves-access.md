---
stepsCompleted:
  - step-01-preflight-and-context
  - step-02-generation-mode
  - step-03-test-strategy
  - step-04-generate-tests
  - step-04c-aggregate
  - step-05-validate-and-complete
lastStep: step-05-validate-and-complete
lastSaved: '2026-06-26'
storyId: '5.5'
storyKey: 5-5-cancellation-preserves-access
storyFile: _bmad-output/implementation-artifacts/stories/epic-005-story-055.md
atddChecklistPath: _bmad-output/test-artifacts/atdd-checklist-5-5-cancellation-preserves-access.md
generatedTestFiles:
  - tests/api/cancellation-preserves-access.spec.ts
  - tests/e2e/cancellation-preserves-access.spec.ts
inputDocuments:
  - _bmad-output/implementation-artifacts/stories/epic-005-story-055.md
  - _bmad-output/project-context.md
  - _bmad/tea/config.yaml
  - packages/api/src/lib/tier.ts
---

# ATDD Checklist: Story 5.5 — Cancellation Preserves Access Until Period End

## TDD Red Phase (Current)

All acceptance test scaffolds generated. All tests use `test.skip()` — they assert expected
behavior and will FAIL once activated, until each task is implemented.

- API Tests: 11 tests (all skipped)
- E2E Tests: 6 tests (all skipped)

---

## Acceptance Criteria Coverage

| AC | Description | API test | E2E test | Priority |
|----|-------------|----------|----------|----------|
| AC-1 | Cancellation preserves tier and tierExpiresAt | ✅ 2 tests | ✅ 2 tests | P0 |
| AC-2 | Lazy expiration check via getEffectiveTier | ✅ 2 tests | — | P0 |
| AC-3 | Auto-renew re-enable within paid period | ✅ 1 test | ✅ 1 test | P1 |
| AC-4 | Periodic tier cleanup (startTierCleanup registered) | ✅ 1 test | — | P1 |
| AC-5 | Gender pref rejected for expired premium_plus | ✅ 1 test | ✅ 1 test | P0 |
| AC-6 | Gender pref allowed during valid cancelled period | ✅ 1 test | ✅ 1 test | P0 |
| T5/T6 | SubscriptionDetail shape (tierExpiresAt, isCancelled, willExpireOn) | ✅ 3 tests | ✅ 1 test | P1 |

---

## Test Strategy

**Detected stack:** fullstack (Next.js + Expo + Hono)

**Execution mode:** sequential (AI generation — backend-heavy story, no recording needed)

**Generation mode:** AI generation from story acceptance criteria and source code analysis

### Test Levels Chosen

- **API tests** (`tests/api/cancellation-preserves-access.spec.ts`): Playwright `request` fixture
  hitting the oRPC HTTP endpoints. Tests the complete request/response contract including
  authentication via session cookie, status codes, and JSON shape.

- **E2E tests** (`tests/e2e/cancellation-preserves-access.spec.ts`): Playwright full browser
  tests targeting the web UI subscription settings page. Tests the user-visible state (banners,
  badges, enabled/disabled controls).

### Why No Unit Tests

The `computeEffectiveTier` and `getEffectiveTier` functions in `packages/api/src/lib/tier.ts`
are already complete and marked as "Do Not Modify" in the story. Unit tests for these would test
already-implemented code, not ATDD red-phase scaffolds. The API integration tests cover the
behavior contract.

---

## Next Steps (Task-by-Task Activation)

During implementation of each task, activate tests in this order:

### T3: Register `startTierCleanup` in `apps/server/src/index.ts`
1. Remove `test.skip()` from `[P1][AC-4]` test in `tests/api/cancellation-preserves-access.spec.ts`
2. Run: `npx playwright test tests/api/cancellation-preserves-access.spec.ts`
3. Verify it FAILS (cleanup not registered yet)
4. Implement T3
5. Verify test now PASSES

### T4: Add `tierExpiresAt` sync to `toggleAutoRenew`
1. Remove `test.skip()` from `[P0][AC-1]` tests (both API tests)
2. Run tests — verify they FAIL
3. Implement T4
4. Verify tests PASS

### T5: Add `tierExpiresAt`, `isCancelled`, `willExpireOn` to `SubscriptionDetail`
1. Remove `test.skip()` from `[P1][T5/T6]` tests (all 3 API + 1 E2E)
2. Run tests — verify they FAIL
3. Implement T5
4. Verify tests PASS

### T6: Expose new fields from `getSubscription` endpoint
- Automatically covered by T5 changes; verify with the same T5/T6 tests

### AC-2 / AC-5 / AC-6: Verify existing feature gate (T1/T2 already done)
1. Remove `test.skip()` from AC-2, AC-5, AC-6 tests
2. These require DB seeding — set up test users with specific tier states
3. Verify test behavior matches expectations

---

## Key Assumptions & Risks

- **DB seeding required**: AC-2, AC-5, AC-6 tests need users seeded with specific `tier` /
  `tierExpiresAt` values. This is not yet automated. Options: Playwright global setup, or a
  test-only seeding API endpoint.

- **oRPC endpoint paths**: Tests use `/api/rpc/billing.getSubscription` and
  `/api/rpc/billing.toggleAutoRenew`. Verify these paths match actual Hono oRPC mount paths
  before activating tests.

- **Auth cookie name**: Uses `better-auth.session_token` — verify this matches the actual
  Better-Auth cookie name in the project's auth config.

- **E2E selectors**: `getByTestId("access-until-banner")`, `getByTestId("gender-preference-select")`
  — these `data-testid` attributes need to be added to the UI components during implementation.

---

## Generated Files

- `tests/api/cancellation-preserves-access.spec.ts` — API/integration tests (11 tests, all `test.skip()`)
- `tests/e2e/cancellation-preserves-access.spec.ts` — E2E browser tests (6 tests, all `test.skip()`)

## Next Recommended Workflow

→ `bmad-dev-story` — implement T3, T4, T5, T6 task by task, activating tests as you go
→ `bmad-testarch-automate` — after implementation, remove `test.skip()` and run full suite
