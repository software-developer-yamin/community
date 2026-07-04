---
workflowStatus: 'completed'
totalSteps: 5
stepsCompleted: ['step-01-detect-mode', 'step-02-load-context', 'step-03-risk-and-testability', 'step-04-coverage-plan', 'step-05-generate-output']
lastStep: 'step-05-generate-output'
nextStep: ''
lastSaved: '2026-07-05'
inputDocuments:
  - '_bmad-output/project-context.md'
  - '_bmad-output/planning-artifacts/epics-recommendation-engine.md'
  - '_bmad/tea/config.yaml'
  - 'packages/api/src/routers/recommendations.ts'
---

# Test Design: Epic RE-5 — User Preferences Management

**Date:** 2026-07-05
**Author:** Yamin
**Status:** Draft

---

## Executive Summary

**Scope:** Epic-level test design for Epic RE-5 — User Preferences Management

Epic RE-5 covers a single story: **RE-5.1 — User Preferences Native UI**, which builds the Settings → Preferences screen on the Expo/React Native client. The backend surface (`getPreferences`, `updatePreferences` in `packages/api/src/routers/recommendations.ts`) is already implemented (FR-15, FR-16). FR-17 (native UI) is the **only unimplemented FR** in this epic and is flagged as a **blocker** in the requirements inventory — this test design focuses on validating the new client surface plus the contract it depends on.

Code inspection of the existing `updatePreferences` handler surfaced a **real, previously-undocumented data-integrity defect** that this epic's UI will directly expose to users: partial notification-toggle updates overwrite the full `notifications` JSON blob rather than merging with existing values (see R-001). This is promoted to the top risk in this design because Story RE-5.1's AC explicitly requires independent notification toggles.

**Risk Summary:**

- Total risks identified: 8
- High-priority risks (score ≥ 6): 3
- Critical categories: DATA (2), TECH (2)

**Coverage Summary:**

- P0 scenarios: 6 (~10–14 hours)
- P1 scenarios: 7 (~7–10.5 hours)
- P2/P3 scenarios: 6 (~2.5–5 hours)
- **Total effort**: ~19.5–29.5 hours (~2.5–4 dev-days)

---

## Epic Scope

| Story | Title | Status |
|-------|-------|--------|
| RE-5.1 | User Preferences Native UI | backlog |

**FRs covered:** FR-15 (get preferences, implemented), FR-16 (update preferences, implemented), FR-17 (native UI, **not implemented — blocker**)

---

## Not in Scope

| Item | Reasoning | Mitigation |
|---|---|---|
| **`getPreferences` / `updatePreferences` oRPC contract correctness** | Already implemented and shipped under FR-15/FR-16 (prior epics); not new work in RE-5 | Covered here only where RE-5.1's UI directly depends on/exposes a defect (see R-001, R-002) |
| **Recommendation scoring after preference change** | Scoring pipeline is Epic RE-3/RE-4 | Verify cache invalidation is *triggered*; scoring correctness is out of scope |
| **Profile embedding recomputation correctness** | Epic RE-2/RE-2.3 territory | Verify `computeProfileEmbedding` is *called* on interests/goals change; embedding math out of scope |
| **Push notification delivery / OS-level scheduling** | No notification-scheduling infrastructure exists yet in `apps/native` (no `expo-notifications` usage found) | Flag as assumption/dependency; test only that the app *attempts* to reschedule, not delivery |
| **Admin-side preferences view** | Admin user list with CEFR + preferences (FR-19) already implemented, separate surface | N/A |
| **Web (Next.js) preferences UI** | Architecture: preferences editing is native-app only per PRD | N/A |

---

## Risk Assessment

### High-Priority Risks (Score ≥ 6)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner | Timeline |
|---|---|---|---|---|---|---|---|---|
| R-001 | DATA | In `updatePreferences` (`recommendations.ts:930-932`), `notifications: input.notifications ? JSON.stringify(input.notifications) : undefined` **replaces the entire notifications JSON blob with only the fields sent**. Since the input schema allows any subset of `{dailyReminder, newContent, progressUpdates}`, toggling one switch in the UI can silently wipe the other two toggle states to `undefined` if the client does not send the full object | 3 | 3 | **9** | API test: update with only `{dailyReminder: false}`; assert `newContent`/`progressUpdates` are unchanged in DB, not lost. UI must always send the full notifications object on any toggle change (client-side mitigation) until backend is fixed to merge | Dev + QA | Before RE-5.1 ships |
| R-002 | DATA | Cache invalidation (`recommendationScore` delete + profile embedding recompute) only fires when `interests` or `goals` change (`semanticPreferenceChanged` check). The AC for RE-5.1 states "the recommendation cache is invalidated" generically for **any** preference save, including `preferredTypes`/`preferredCefr`/`dailyGoal` changes — those currently do **not** invalidate the cache, so recommendations may not reflect updated content-type/CEFR preferences until natural cache expiry | 2 | 3 | **6** | API test: update `preferredTypes` only (no interests/goals change); assert whether cache invalidation fires. If it does not, treat as a known gap and align UI copy/AC expectations, or file a follow-up fix | QA + PM | Before RE-5.1 release (decision required) |
| R-003 | TECH | No push/local notification scheduling infrastructure exists in `apps/native` today (`expo-notifications` not found in dependency scan). AC requires "the daily reminder notification time is adjusted accordingly" when `dailyGoal` changes — this depends on infra that may not exist yet | 2 | 3 | **6** | Confirm with Dev whether notification scheduling is in scope for RE-5.1 or a separate story; if in scope, test scheduling call is invoked with correct time, not actual OS delivery | Dev + QA | Before RE-5.1 implementation starts |

### Medium-Priority Risks (Score 3–5)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner |
|---|---|---|---|---|---|---|---|
| R-004 | BUS | Client-side validation for "max 20 interests" / "max 4 preferred types" must mirror server Zod limits (`interests.max(20)`, `preferredTypes.max(4)`, `goals.max(10)`). If client and server limits drift, users see a confusing late 400 error instead of the specified inline message | 2 | 2 | **4** | Component/unit test: attempting to add 21st interest tag is blocked client-side with exact copy "You can add up to 20 interests"; 5th content type checkbox is disabled | QA + Dev |
| R-005 | TECH | No React Native component-test harness (RNTL/Jest) currently configured in `apps/native` — existing native tests (`network-state.test.ts`, `crash-reporter.test.ts`) are pure-logic unit tests, not rendered-component tests | 2 | 2 | **4** | Extract form/validation logic (tag add/remove, limit checks, default-value derivation) into plain testable functions per existing project pattern; reserve full component rendering tests for a lighter smoke pass if/when RNTL is added | Dev + QA |
| R-006 | DATA | Optional fields not included in an update payload (e.g., saving only `dailyGoal`) are spread into Drizzle's `.set(data)` call; if `undefined` values are not filtered by Drizzle before the SQL update, other columns could be nulled on a partial save | 2 | 2 | **4** | API test: update `dailyGoal` alone; assert `interests`/`goals`/`preferredTypes`/`preferredCefr` are unchanged in DB afterward | QA + Dev |

### Low-Priority Risks (Score 1–2)

| Risk ID | Category | Description | Probability | Impact | Score | Action |
|---|---|---|---|---|---|---|
| R-007 | BUS | Defaults screen (no preferences row yet) must show `interests: []`, `goals: []`, `preferredTypes: []`, `preferredCefr: null`, `dailyGoal: 15`, all notifications enabled — matches `getPreferences` fallback object exactly; low risk since values are hardcoded and already tested indirectly by RE-2.3 tests | 1 | 2 | **2** | Confirm with a light regression test rather than new coverage |
| R-008 | OPS | Feed refresh "on next visit" after save is a client-side cache/query-invalidation concern (React Query), not a server contract; low risk of silent staleness if `queryClient.invalidateQueries` is missed | 1 | 2 | **2** | Monitor — verify with a smoke check during implementation review |

### Risk Category Legend

- **TECH**: Technical/Architecture (flaws, integration, scalability)
- **SEC**: Security (access controls, auth, data exposure)
- **PERF**: Performance (SLA violations, degradation, resource limits)
- **DATA**: Data Integrity (loss, corruption, inconsistency)
- **BUS**: Business Impact (UX harm, logic errors, revenue)
- **OPS**: Operations (deployment, config, monitoring)

---

## NFR Planning

**Purpose:** Capture epic-specific NFR thresholds, planned validation, and evidence expected for later `nfr-assess`. This is not a final evidence audit.

| NFR Category | Requirement / Threshold | Risk Link | Planned Validation | Evidence Needed |
|---|---|---|---|---|
| Data Integrity — Notification toggles | Partial toggle update must not erase sibling toggle values | R-001 | API test: partial notifications payload; assert other keys preserved in DB | API test report + DB row inspection |
| Data Integrity — Partial preference save | Saving one field (e.g., `dailyGoal`) must not null out untouched fields | R-006 | API test: single-field update; assert all other columns unchanged | API test report |
| Data Integrity — Cache invalidation scope | Recommendation cache invalidation should fire for all preference changes that affect scoring inputs, not only interests/goals | R-002 | API test: update `preferredTypes`/`preferredCefr`; assert cache row deleted (or explicitly document as accepted gap) | API test report + product decision record |
| Security — Auth on preferences endpoints | `getPreferences`/`updatePreferences` are `protectedProcedure` — require an authenticated session | — | Existing auth middleware coverage (regression only; no new tests planned) | Existing auth test suite |
| Usability — Client-side limits | Interests ≤ 20, goals ≤ 10, preferred types ≤ 4 enforced before hitting network | R-004 | Unit test on extracted validation functions | Unit test report |

**Unknown thresholds:**
- No defined SLA for preferences save round-trip time (not specified in PRD; treat as best-effort, no perf test planned this epic).
- Notification-rescheduling mechanism (local notification vs. push) is undecided; R-003 blocks precise test design for that AC until infra is confirmed.

---

## Entry Criteria

- [ ] RE-5.1 story spec reviewed and agreed by QA, Dev, PM
- [ ] Decision made on R-002 (cache invalidation scope) and R-001 (notifications merge fix vs. client-side full-object-send mitigation)
- [ ] Confirmation of whether local/push notification scheduling (R-003) is in scope for this story
- [ ] Test environment with the existing `updatePreferences`/`getPreferences` oRPC endpoints reachable from a native test harness or via direct API tests
- [ ] Test user(s) seeded with and without existing `userPreference` rows (to exercise defaults path)

## Exit Criteria

- [ ] All P0 tests passing (100%)
- [ ] All P1 tests passing (≥ 95%)
- [ ] R-001 (notifications overwrite) verified and mitigated (client sends full object, or backend merges)
- [ ] R-002 (cache invalidation scope) resolved as either fixed or explicitly accepted with documented rationale
- [ ] No open HIGH or CRITICAL bugs
- [ ] Defaults path (no existing preference row) verified end-to-end

---

## Test Coverage Plan

### RE-5.1: User Preferences Native UI

### P0 (Critical) — Run on every commit

**Criteria**: Data integrity + core new functionality; HIGH (≥ 6) risk; no workaround if broken.

| ID | Requirement | AC | Test Level | Risk Link | Test Count | Notes |
|---|---|---|---|---|---|---|
| RE5.1-API-001 | Partial notification update preserves untouched toggle values | RE-5.1 AC (notification toggles) | API | R-001 | 1 | Seed all-true notifications; update with `{dailyReminder: false}` only; assert `newContent`/`progressUpdates` remain `true` in DB |
| RE5.1-API-002 | Single-field update (`dailyGoal` only) leaves other preference columns unchanged | RE-5.1 AC (save daily goal) | API | R-006 | 1 | Seed full preference row; update `dailyGoal` alone; assert interests/goals/preferredTypes/preferredCefr unchanged |
| RE5.1-API-003 | `updatePreferences` called with new values on Save; verify cache-invalidation behavior for `preferredTypes`/`preferredCefr`-only change | RE-5.1 AC (save → cache invalidated) | API | R-002 | 1 | Update `preferredTypes` only; assert `recommendationScore` rows deleted (or document as known gap per product decision) |
| RE5.1-UNIT-001 | Adding a 21st interest is rejected client-side with exact message | RE-5.1 AC (max 20 interests) | Unit | R-004 | 1 | Extracted validation function; assert rejection + copy "You can add up to 20 interests" |
| RE5.1-UNIT-002 | Selecting a 5th preferred content type disables further selection | RE-5.1 AC (max 4 types) | Unit | R-004 | 1 | Extracted validation function; assert 5th selection blocked |
| RE5.1-UNIT-003 | Defaults derivation matches `getPreferences` fallback exactly when no row exists | RE-5.1 AC (no preferences set) | Unit | R-007 | 1 | Assert `interests:[], goals:[], preferredTypes:[], preferredCefr:null, dailyGoal:15, notifications: all true` |

**Total P0**: 6 tests, ~10–14 hours

---

### P1 (High) — Run on PR to main

**Criteria**: Core feature functionality + medium risk; important user journeys.

| ID | Requirement | AC | Test Level | Risk Link | Test Count | Notes |
|---|---|---|---|---|---|---|
| RE5.1-UNIT-004 | Interest tag add/remove logic (pill add on submit, remove on X tap) | RE-5.1 AC (interests tag input) | Unit | — | 1 | Extracted tag-list reducer/helper function |
| RE5.1-API-004 | Save with full form payload (interests, goals, preferredTypes, preferredCefr, dailyGoal, notifications) updates all fields correctly | RE-5.1 AC (form → save) | API | — | 1 | Assert `updatePreferences` response reflects every field |
| RE5.1-API-005 | Interests/goals change triggers profile embedding recompute + cache invalidation (regression of existing `semanticPreferenceChanged` behavior) | RE-5.1 AC (save → cache invalidated) | API | — | 1 | Regression check of existing RE-2.3 behavior now exercised via new UI path |
| RE5.1-UNIT-005 | Daily goal slider clamps to [1, 120] and rejects out-of-range values before save | RE-5.1 AC (daily goal 1-120) | Unit | — | 1 | Boundary values 0, 1, 120, 121 |
| RE5.1-UNIT-006 | Success toast copy exact match: "Preferences saved. Your recommendations will update." | RE-5.1 AC (success toast) | Unit/Component | — | 1 | String/snapshot assertion on toast trigger |
| RE5.1-API-006 | CEFR override accepts only valid enum values (A1–C2); invalid value rejected with 400 | RE-5.1 AC (preferred CEFR dropdown) | API | — | 1 | Dropdown is closed-set in UI, but API-level guard tested directly |
| RE5.1-INT-001 | Feed query is invalidated/refetched after a successful preferences save (React Query) | RE-5.1 AC (feed refreshed on next visit) | Integration | R-008 | 1 | Assert `queryClient.invalidateQueries` called for recommendations query key on save success |

**Total P1**: 7 tests, ~7–10.5 hours

---

### P2 (Medium) — Run nightly

**Criteria**: Secondary flows + low/medium risk + edge cases.

| ID | Requirement | AC | Test Level | Risk Link | Test Count | Notes |
|---|---|---|---|---|---|---|
| RE5.1-UNIT-007 | Removing all interests leaves an empty tag list without error | RE-5.1 AC (remove interests) | Unit | — | 1 | Edge case of tag removal helper |
| RE5.1-API-007 | Notification reschedule call attempted when `dailyGoal` changes (if in scope per R-003) | RE-5.1 AC (daily reminder time adjusted) | API/Unit | R-003 | 1 | Mark as pending until notification infra decision is made |
| RE5.1-UNIT-008 | Regression: existing preferences form fields render with previously saved values on reopen | RE-5.1 AC (view/edit preferences) | Unit/Component | — | 1 | Pre-seeded preference row renders correctly |

**Total P2**: 3 tests, ~1.5–3 hours

---

### P3 (Low) — Run on-demand

**Criteria**: Nice-to-have, exploratory, edge cases with minimal risk.

| ID | Requirement | Test Level | Test Count | Notes |
|---|---|---|---|---|
| RE5.1-UNIT-009 | Rapid repeated Save taps do not create duplicate `updatePreferences` calls (basic debounce/idempotency check) | Unit | 1 | Exploratory; low priority |
| RE5.1-UNIT-010 | Interests with leading/trailing whitespace or duplicate casing (e.g., "Travel" vs "travel") are handled consistently | Unit | 1 | No AC coverage; nice-to-have |
| RE5.1-UNIT-011 | Idempotent save: saving unchanged form twice does not re-trigger embedding recompute | Unit | 1 | Guards against unnecessary recompute cost |

**Total P3**: 3 tests, ~1–2 hours

---

## Execution Order

### Smoke Tests (< 3 min)

- [ ] RE5.1-UNIT-003: Defaults derivation matches fallback (20s)
- [ ] RE5.1-API-004: Full-payload save updates all fields (30s)
- [ ] RE5.1-UNIT-001: 21st interest rejected (15s)

**Total**: 3 scenarios

### P0 Tests (< 10 min)

- [ ] RE5.1-API-001: Notification partial-update preserves siblings
- [ ] RE5.1-API-002: Single-field update leaves others unchanged
- [ ] RE5.1-API-003: Cache invalidation on non-semantic field change
- [ ] RE5.1-UNIT-001/002/003: Client-side limits + defaults

**Total**: 6 scenarios

### P1 Tests (< 25 min)

- [ ] RE5.1-UNIT-004 to RE5.1-UNIT-006: Tag input, daily goal clamp, toast copy
- [ ] RE5.1-API-004 to RE5.1-API-006: Full save, embedding regression, CEFR guard
- [ ] RE5.1-INT-001: Feed query invalidation

**Total**: 7 scenarios

### P2/P3 Tests (< 20 min)

- [ ] RE5.1-UNIT-007/008: Tag-list edge case, reopen renders saved values
- [ ] RE5.1-API-007: Notification reschedule (pending infra decision)
- [ ] RE5.1-UNIT-009 to RE5.1-UNIT-011: Debounce, casing, idempotency

**Total**: 6 scenarios

---

## Resource Estimates

### Test Development Effort

| Priority | Count | Hours/Test | Total Hours | Notes |
|---|---|---|---|---|
| P0 | 6 | 1.5–2.5 | 10–14 | DB assertions for R-001/R-002/R-006 need seeded fixtures |
| P1 | 7 | 1.0–1.5 | 7–10.5 | Standard unit/API coverage; one React Query integration test |
| P2 | 3 | 0.5–1.0 | 1.5–3 | Edge cases; one item pending infra decision |
| P3 | 3 | 0.33–0.67 | 1–2 | Exploratory |
| **Total** | **19** | **—** | **19.5–29.5** | **~2.5–4 dev-days** |

### Prerequisites

**Test Data:**
- `userPreference` fixture with all-true notifications (for R-001 partial-update test)
- `userPreference` fixture with a full set of fields populated (for R-006 single-field-update test)
- User with **no** `userPreference` row (defaults path)

**Tooling:**
- `bun:test` — matches existing pattern in `packages/api/src/routers/__tests__/*.test.ts`
- Extracted pure-logic helpers for tag add/remove, limit validation, defaults derivation — needed because `apps/native` has no React Native component-test harness (RNTL/Jest) configured today (R-005); component-level rendering tests are deferred until that harness exists
- React Query test utilities (`queryClient`) for RE5.1-INT-001

**Environment:**
- Test PostgreSQL with `userPreference` table migrated
- Hono server running against test DB with `protectedProcedure` auth fixture (reuse existing `loginAs`-style session helper)

---

## Quality Gate Criteria

### Pass/Fail Thresholds

- **P0 pass rate**: 100% (no exceptions — R-001 is a real, verifiable data-loss defect)
- **P1 pass rate**: ≥ 95%
- **P2/P3 pass rate**: ≥ 90% (informational)
- **High-risk mitigations (R-001, R-002, R-003)**: 100% complete, resolved, or explicitly accepted with documented rationale before release

### Coverage Targets

- **Data integrity (DATA) scenarios**: 100% — R-001/R-002/R-006 all verified by DB-level assertion
- **Critical paths**: ≥ 80%
- **Business/UX logic**: ≥ 70%
- **Edge cases**: ≥ 50%

### Non-Negotiable Requirements

- [ ] All P0 tests pass, especially R-001 (notifications overwrite) and R-006 (partial update field loss)
- [ ] R-002 (cache invalidation scope) has an explicit decision recorded (fix or accepted gap) before RE-5.1 closes
- [ ] R-003 (notification reschedule infra) scoped in or explicitly deferred to a follow-up story before RE-5.1 closes
- [ ] No HIGH or CRITICAL bugs open at time of epic close
- [ ] Planned NFR evidence exists or `nfr-assess` has documented CONCERNS/waivers

---

## Mitigation Plans

### R-001: Partial notification update overwrites sibling toggle values — Score: 9

**Mitigation Strategy:** Short-term: native client always sends the full `notifications` object (merging its own local state with any change) so the server-side overwrite is harmless. Longer-term/preferred: fix `updatePreferences` handler to merge `input.notifications` with the existing stored object before `JSON.stringify`, rather than replacing wholesale.
**Owner:** Dev + QA
**Timeline:** Before RE-5.1 ships
**Status:** Planned
**Verification:** RE5.1-API-001 passes

### R-002: Cache invalidation does not fire for non-semantic preference changes — Score: 6

**Mitigation Strategy:** Either extend `semanticPreferenceChanged` to also cover `preferredTypes`/`preferredCefr` (since these affect scoring per the recommendations router's CEFR/tag scoring logic), or explicitly document to PM/QA that only interests/goals changes refresh recommendations immediately, and adjust the AC/UI copy accordingly.
**Owner:** Dev + PM + QA
**Timeline:** Decision before RE-5.1 release; fix (if chosen) before release
**Status:** Planned
**Verification:** RE5.1-API-003 passes against the agreed behavior

### R-003: Notification-rescheduling infrastructure may not exist — Score: 6

**Mitigation Strategy:** Confirm with Dev during story kickoff whether `dailyGoal`-driven reminder rescheduling is in scope for RE-5.1 or split into a follow-up story once notification infra (e.g., `expo-notifications`) is added. If deferred, remove/soften the corresponding AC and demote RE5.1-API-007 to a tracking item rather than a blocking test.
**Owner:** Dev + PM
**Timeline:** Before RE-5.1 implementation starts
**Status:** Planned
**Verification:** RE5.1-API-007 passes, or scope decision is documented and AC updated

---

## Assumptions and Dependencies

### Assumptions

1. `apps/native` has no existing preferences/settings screen — this is greenfield UI work; no legacy screen to migrate or regression-test.
2. No React Native component-test harness (Jest + React Native Testing Library) is currently configured in `apps/native`; existing native tests are pure-logic unit tests. This design assumes form/validation logic will be extracted into plain, directly-testable functions following that existing pattern (see R-005).
3. The backend `getPreferences`/`updatePreferences` contract (fields, defaults, limits) will not change shape for this story; RE-5.1 is a client-only story consuming an existing contract.
4. `expo-notifications` or equivalent scheduling infrastructure is not yet present in the codebase; the "daily reminder time adjusted" AC may require new infra out of this story's original estimate (see R-003).

### Dependencies

1. Decision on R-001 (client-side full-object mitigation vs. backend merge fix) — required before P0 test RE5.1-API-001 can be finalized against expected behavior.
2. Decision on R-002 (cache invalidation scope) — required before P0 test RE5.1-API-003 assertion direction is fixed.
3. Decision on R-003 (notification scheduling scope) — required before RE5.1-API-007 can be written or is formally deferred.
4. Test user session fixtures (authenticated, protectedProcedure-compatible) — reuse existing pattern from `packages/api/src/routers/__tests__/profile-embedding.test.ts`.

### Risks to Plan

- **Risk**: R-001 fix (backend merge) could be deprioritized in favor of "client always sends full object," leaving the underlying defect live for any other future caller of `updatePreferences`.
  - **Impact**: Any future integration (e.g., admin editing user preferences, a future API client) could reintroduce data loss.
  - **Contingency**: File a tracked follow-up ticket for the backend merge fix regardless of the short-term client mitigation chosen for RE-5.1.

- **Risk**: R-003's notification infrastructure turns out to be a larger, unscoped effort once implementation starts.
  - **Impact**: RE-5.1 could balloon in scope or slip its estimate.
  - **Contingency**: Split notification-reschedule behavior into its own follow-up story; ship the rest of RE-5.1 (form, save, defaults, validation) independently.

---

## Interworking & Regression

| Service/Component | Impact | Regression Scope |
|---|---|---|
| **oRPC `recommendationsRouter.getPreferences`/`updatePreferences`** | Consumed by new native UI for the first time; no contract change expected | Existing `profile-embedding.test.ts` coverage of `updatePreferences` → embedding recompute must still pass |
| **`userPreference` Drizzle table** | New write patterns (partial updates from UI) may exercise previously-untested paths (R-001, R-006) | No schema change; DB assertions added as new coverage |
| **`recommendationScore` cache** | Cache invalidation behavior scrutinized under R-002 | Existing RE-3/RE-4 scoring tests must remain unaffected |
| **`computeProfileEmbedding` (RE-2.3)** | Re-exercised via new UI save path for interests/goals changes | Existing RE-2.3 profile-embedding tests (`T-2.3-03`) must still pass |
| **React Query cache (native app)** | New `invalidateQueries` call on save success for recommendations feed | No prior native query invalidation tests exist; new coverage only |

---

## Follow-on Workflows (Manual)

- Run `*atdd` on P0 scenarios (RE5.1-API-001, RE5.1-API-002, RE5.1-API-003) to generate failing RED-phase API tests immediately — these validate real, already-discoverable defects independent of the UI build.
- Run `*atdd` on RE5.1-UNIT-001/002/003 once the form/validation module is scaffolded.
- Run `*automate` for broader UI coverage after the native screen is implemented.
- Run `*nfr-assess` once implementation evidence (test reports, DB query results) is available.

---

## Approval

**Test Design Approved By:**

- [ ] Product Manager: — Date: —
- [ ] Tech Lead: — Date: —
- [ ] QA Lead: — Date: —

**Comments:**

---

## Appendix

### Knowledge Base References

- `risk-governance.md` — Risk classification framework
- `probability-impact.md` — Risk scoring methodology (P × I = 1–9)
- `test-levels-framework.md` — Test level selection (unit / integration / E2E)
- `test-priorities-matrix.md` — P0–P3 prioritization

### Related Documents

- Epic: `_bmad-output/planning-artifacts/epics-recommendation-engine.md` — Epic RE-5 section
- Requirements inventory: FR-15/FR-16/FR-17 status table (same document)
- Backend implementation: `packages/api/src/routers/recommendations.ts` (`getPreferences`, `updatePreferences`)
- GH Issue: RE-5.1 → #52

---

**Generated by**: BMad TEA Agent - Test Architect Module
**Workflow**: `bmad-testarch-test-design`
**Version**: 4.0 (BMad v6)
