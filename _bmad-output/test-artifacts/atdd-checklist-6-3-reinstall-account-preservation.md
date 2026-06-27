---
stepsCompleted:
  - step-01-preflight-and-context
  - step-02-generation-mode
  - step-03-test-strategy
  - step-04-generate-tests
  - step-04c-aggregate
  - step-05-validate-and-complete
lastStep: step-05-validate-and-complete
lastSaved: '2026-06-28'
storyId: '6.3'
storyKey: 6-3-reinstall-account-preservation
storyFile: _bmad-output/implementation-artifacts/stories/epic-006-story-063.md
atddChecklistPath: _bmad-output/test-artifacts/atdd-checklist-6-3-reinstall-account-preservation.md
generatedTestFiles:
  - tests/api/reinstall-account-preservation.spec.ts
  - tests/e2e/reinstall-account-preservation.spec.ts
inputDocuments:
  - _bmad-output/implementation-artifacts/stories/epic-006-story-063.md
  - _bmad-output/project-context.md
  - _bmad/tea/config.yaml
  - packages/api/src/routers/rebuild.ts
  - packages/auth/src/index.ts
---

# ATDD Checklist: Story 6.3 — Reinstall Account Preservation

## TDD Red Phase (Current)

All acceptance test scaffolds generated. All tests use `test.skip()` — they assert expected
behavior and will FAIL once activated, until each task is implemented.

- API Tests: 14 tests (all skipped)
- E2E Tests: 6 tests (all skipped)

---

## Acceptance Criteria Coverage

| AC | Description | API tests | E2E tests | Priority |
|----|-------------|-----------|-----------|----------|
| AC-1 | Same-method reinstall restores full account | ✅ 2 tests | ✅ 2 tests | P0 |
| AC-2 | Subscription state is server-authoritative | ✅ 2 tests | ✅ 1 test  | P0 |
| AC-3 | Cross-provider linking via email matching (T1) | ✅ 2 tests | ✅ 1 test  | P0 |
| AC-4 | Account recovery via linkAccount (T2) | ✅ 5 tests | —         | P0/P1 |
| AC-5 | No data migration when current profile exists | ✅ 2 tests | —         | P1 |
| AC-6 | Profile and history accessible after reinstall | ✅ 2 tests | ✅ 2 tests | P0 |

---

## Test Strategy

**Detected stack:** fullstack (Next.js + Expo + Hono)

**Execution mode:** sequential (AI generation — backend-heavy story, account/auth logic)

**Generation mode:** AI generation from story acceptance criteria and source code analysis

### Test Levels Chosen

- **API tests** (`tests/api/reinstall-account-preservation.spec.ts`): Playwright `request` fixture
  hitting oRPC HTTP endpoints. Covers the auth invariants (same userId on re-auth), the new
  `rebuild.linkAccount` procedure (T2), and server-authoritative subscription queries (AC-2).

- **E2E tests** (`tests/e2e/reinstall-account-preservation.spec.ts`): Playwright full-browser
  tests targeting the web app sign-in flow and profile/subscription pages. Covers AC-1, AC-2,
  AC-6 from a user-visible angle.

### Why No Native E2E Coverage for T3

T3 (`apps/native/components/account-recovery.tsx`) is a React Native component rendered inside
the Expo app. Playwright cannot drive native UI. Native coverage for the account-recovery prompt
(AC-4 user flow) belongs in a future Detox story. The `linkAccount` API contract (T2) is
thoroughly tested at the API level.

### Why No Unit Tests

The story's implementation tasks are:
- T1: Config-only change to `packages/auth/src/index.ts` — no functions to unit-test
- T2: A new `linkAccount` DB procedure — covered by API integration tests
- T3: Native UI component — Playwright cannot reach it
- T4: API tests explicitly requested in the story spec

Unit tests would test already-existing Drizzle query builders or Better-Auth internals, which
are out of scope for ATDD red-phase scaffolds.

---

## Next Steps (Task-by-Task Activation)

Activate tests in this order as each task is implemented:

### T1: Enable accountLinking in `packages/auth/src/index.ts`

1. Remove `test.skip()` from `[P0][AC-3]` tests in `tests/api/reinstall-account-preservation.spec.ts`
2. Run: `npx playwright test tests/api/reinstall-account-preservation.spec.ts`
3. Verify they FAIL (account linking not enabled yet)
4. Add `account: { accountLinking: { enabled: true, trustedProviders: ["google", "email-password"] } }` to `betterAuth()`
5. Verify tests PASS

### T2: Add `linkAccount` to `packages/api/src/routers/rebuild.ts`

1. Remove `test.skip()` from all `[AC-4]` and `[AC-5]` tests
2. Run tests — verify they FAIL (procedure not found yet)
3. Implement `linkAccount` handler (see story spec for exact implementation)
4. Verify tests PASS

Activation order within T2:
- `[P0][AC-4] linkAccount re-points phone account row` — happy path
- `[P0][AC-4] linkAccount returns NOT_FOUND` — error case
- `[P1][AC-4] linkAccount returns same_account` — no-op case
- `[P1][AC-4] linkAccount returns CONFLICT` — guard case
- `[P1][AC-4] unauthenticated returns 401` — auth guard
- `[P1][AC-5]` tests — conditional profile migration

### T3: Native AccountRecovery component (`apps/native/components/account-recovery.tsx`)

No Playwright tests exist for this native component. Verify manually on device/simulator:
- After fresh Google sign-in (no userProfile), the recovery prompt is shown
- Entering phone number and submitting calls `rebuild.linkAccount`
- On `linked: true`, inline "Account restored!" message appears and queries are invalidated
- Skip button dismisses the prompt without calling the API

### T4: API tests (`tests/api/reinstall-account-preservation.spec.ts`)

The story explicitly requests these tests (see story T4 spec). They are generated here.

Activate AC-1, AC-2, AC-6 tests once DB seeding is set up:
- `[P0][AC-1]` — requires seeded user with cefrLevel=B2, nativeLanguage=Bengali, call history
- `[P0][AC-2]` — requires seeded user with tier=premium, endsAt in future
- `[P0][AC-6]` — requires seeded user with rated callRoom records

---

## Key Assumptions & Risks

- **DB seeding required**: AC-1, AC-2, AC-6 tests need users seeded with specific profile and
  subscription states. Options: Playwright global setup script, or a test-only seeding API
  endpoint. Seed spec is in the test file header.

- **oRPC endpoint paths**: Tests use `/api/rpc/rebuild.getProfile`, `/api/rpc/rebuild.linkAccount`,
  `/api/rpc/billing.getSubscription`. Verify these paths match the actual Hono oRPC mount in
  `apps/server/src/index.ts` before activating.

- **`rebuild.getCallHistory` endpoint**: `[P0][AC-6]` tests assume a `getCallHistory` procedure
  exists on the rebuild router. Verify the actual procedure name before activating.

- **Auth cookie name**: Uses `better-auth.session_token` — verify this matches the project's
  Better-Auth cookie name.

- **Google OAuth in E2E**: The `[P1][AC-3]` E2E test notes that full Google OAuth requires an
  OAuth mock integration not yet present. API-level AC-3 tests provide the primary coverage.

- **Native AC-4 UI**: The account recovery prompt (T3) cannot be tested with Playwright.
  Rely on manual testing or add Detox tests in a future story.

- **data-testid attributes**: E2E tests reference `user-cefr-level`, `native-language`,
  `total-call-count`, `subscription-tier`, `subscription-status`, `call-history-item`,
  `call-rating-badge`. These attributes must be added to the respective UI components during T3/T4
  implementation.

---

## Generated Files

- `tests/api/reinstall-account-preservation.spec.ts` — API/integration tests (14 tests, all `test.skip()`)
- `tests/e2e/reinstall-account-preservation.spec.ts` — E2E browser tests (6 tests, all `test.skip()`)

## Next Recommended Workflow

→ `bmad-dev-story` — implement T1, T2, T3, T4 task by task, activating tests as you go
→ `bmad-testarch-automate` — after all tasks are done, remove `test.skip()` and run full suite
