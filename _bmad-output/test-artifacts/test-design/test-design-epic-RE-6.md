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
  - '_bmad-output/implementation-artifacts/sprint-status.yaml'
  - '_bmad/tea/config.yaml'
  - 'packages/api/src/routers/recommendations.ts'
  - 'packages/db/src/schema/recommendations.ts'
  - 'packages/db/src/schema/auth.ts'
  - 'apps/web/src/app/admin/analytics/page.tsx'
  - 'apps/web/src/app/admin/layout.tsx'
---

# Test Design: Epic RE-6 — Admin Content Management & Analytics

**Date:** 2026-07-05
**Author:** Yamin
**Status:** Draft

---

## Executive Summary

**Scope:** Epic-level test design for Epic RE-6 — Admin Content Management & Analytics

Epic RE-6 delivers the admin-facing analytics dashboard that surfaces content engagement, CEFR-level coverage, interaction trends, and user-engagement metrics so administrators can spot content gaps and measure recommendation-engine health. One story is in scope:

- **Story RE-6.1** — Admin Content Analytics: dashboard totals, CEFR distribution chart, top-20 engagement table (sortable by likes/completions with trend indicators), interaction trend chart with 7d/30d/90d ranges and week-over-week comparison, and a "Users" tab (active users, preference completion rate, average session duration), all loading in ≤3s with skeleton states.

A partial implementation already exists: `recommendations.adminStats` (adminProcedure-gated) returns basic counts, the 10 most recent interactions, and top-10 content by `like` count only. `apps/web/src/app/admin/analytics/page.tsx` renders an action-distribution grid, a single "Top Content by Likes" table, and a system-overview grid. **None of the following AC-required features exist yet**: CEFR distribution chart (including zero-count levels), top-20 with trend indicators, date-range interaction trend line chart, week-over-week comparison, or the "Users" tab (active users / preference completion rate / average session duration). This is materially new backend + frontend work, not a refactor of existing code.

Two data-model gaps stand out as architecturally significant: (1) there is no tracked concept of "session duration" in the `session` table (only `createdAt`/`expiresAt`/`updatedAt`, which better-auth mutates on token refresh, not on user activity), and (2) "active users" and "preference completion" require careful null-handling because `userPreference` rows are not guaranteed to exist for every user.

**Risk Summary:**

- Total risks identified: 12
- High-priority risks (score ≥ 6): 5
- Critical categories: DATA (5), SEC (1), TECH (1)

**Coverage Summary:**

- P0 scenarios: 6 (~10–14 hours)
- P1 scenarios: 7 (~9–13 hours)
- P2 scenarios: 5 (~5–9 hours)
- P3 scenarios: 2 (~1–2 hours)
- **Total effort**: ~25–38 hours (~3–5 dev-days)

---

## Not in Scope

| Item | Reasoning | Mitigation |
|---|---|---|
| **Content CRUD (create/update/delete/bulk import)** | Covered by Epic RE-1 | Regression-smoke only if analytics reads from content table |
| **Embedding computation/recomputation** | Covered by Epic RE-2 | N/A — analytics only reads embedding-adjacent counts, not embedding vectors |
| **Recommendation scoring logic** | Covered by Epic RE-3/RE-4 | Analytics treats `recommendationScore`/`userInteraction` as read-only source data |
| **Native (Expo) admin UI** | Architecture: admin panel is web-only (Next.js), matching Epic RE-1 precedent | N/A |
| **Chart library selection / visual polish** | No AC specifies a charting library; implementation detail | Verify data correctness, not pixel rendering |
| **Alerting/notifications on analytics thresholds** | Not in any AC | Out of scope until a future story requests it |
| **Historical backfill of analytics for pre-launch data** | No AC requires historical reconstruction | Document as a known gap if stakeholders ask |

---

## Risk Assessment

### High-Priority Risks (Score ≥ 6)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner | Timeline |
|---|---|---|---|---|---|---|---|---|
| R-001 | SEC | New analytics endpoints (trends, users-tab metrics) may not be wrapped in `adminProcedure` the same way `adminStats` is today; a missed endpoint exposes interaction-level and user-level data to non-admins | 2 | 3 | **6** | API tests: 401 unauthenticated, 403 non-admin, 200 admin on every new analytics procedure | QA + Dev | Before RE-6.1 release |
| R-002 | DATA | CEFR distribution built with a naive `GROUP BY cefrLevel` query will omit CEFR levels that have zero content items — directly defeating the AC's stated purpose ("identify which levels have insufficient content, e.g., only 2 C2 items") | 3 | 3 | **9** | API test: seed content covering only 4 of 6 CEFR levels; assert response includes all 6 levels with the two missing levels reported as `count: 0` | QA + Dev | Before RE-6.1 release |
| R-003 | DATA | "Active users (viewed feed in last 7d)" is ambiguous — no dedicated "feed view" event exists, only per-content `userInteraction.action = "view"` rows. If the query counts any interaction type or uses the wrong date column, the metric silently misrepresents engagement | 2 | 3 | **6** | API test: seed users with `view` interactions inside/outside the 7-day window and with non-view actions only; assert only users with a `view` interaction inside the window are counted | QA + Dev | Before RE-6.1 release |
| R-004 | DATA | "Preference completion rate (% with ≥3 interests)" must treat users with **no** `userPreference` row as 0% complete. If the query only counts existing rows in the denominator, users who never touched preferences are silently excluded, inflating the rate | 2 | 3 | **6** | API test: seed users with no preference row, with <3 interests, and with ≥3 interests; assert denominator = total users, numerator = only ≥3-interest users | QA + Dev | Before RE-6.1 release |
| R-005 | TECH | "Average session duration" has no backing data — the `session` table only stores `createdAt`, `expiresAt`, and better-auth-managed `updatedAt` (mutated on token refresh, not user activity). Any duration computed from these columns will be meaningless or misleading | 3 | 2 | **6** | ASR (ACTIONABLE): flag to PM/architect before implementation. Either (a) instrument a real last-activity timestamp, or (b) descope this sub-metric and document as a known limitation. Do not ship a fabricated number | Dev + PM | Before RE-6.1 implementation starts |

### Medium-Priority Risks (Score 3–5)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner |
|---|---|---|---|---|---|---|---|
| R-006 | DATA | "Average likes per item" can divide by zero when content count is 0 (fresh environment), producing `NaN`/`Infinity` rendered in the UI | 2 | 2 | **4** | API test: zero-content environment; assert metric returns `0`, not `NaN` | QA + Dev |
| R-007 | BUS | "Trend indicators" on top-20 content are unspecified (no defined comparison window or formula in the AC) | 2 | 2 | **4** | Clarify formula (e.g., current 7d vs prior 7d count) with PM before implementation; API test once defined | QA + PM |
| R-008 | PERF | Interaction-trend endpoint groups `userInteraction` by day across a date range; existing index is composite on `(userId, createdAt)`, not a bare `createdAt` index — full trend scans across all users may not use the index efficiently at scale | 2 | 2 | **4** | API test asserts correctness now; add a perf/EXPLAIN check once dataset size is known; consider a `createdAt`-only or `(createdAt, action)` index if needed | Dev |
| R-009 | DATA | Week-over-week comparison has no defined behavior for the first week of data (no prior period to compare against) — naive division produces `NaN`/`Infinity` or a crash | 2 | 2 | **4** | API test: date range where the prior period has zero rows; assert graceful `null`/`0%` result, not an error | QA + Dev |
| R-010 | BUS | Extending "top content" to sort by `completions` in addition to `likes` risks duplicated/inconsistent query logic between the two sort modes (today only `like` is implemented) | 2 | 2 | **4** | API tests for both sort modes against the same seeded dataset; assert consistent item objects and correct ordering per mode | QA + Dev |

### Low-Priority Risks (Score 1–2)

| Risk ID | Category | Description | Probability | Impact | Score | Action |
|---|---|---|---|---|---|---|
| R-011 | OPS | Skeleton loading states are already an established pattern (`isLoading` branch in current page) — low risk of regression when extended to new widgets | 1 | 2 | **2** | Smoke-check only; reuse existing pattern |
| R-012 | PERF | ≤3s load NFR could be missed once the dashboard aggregates 4+ widgets (totals, CEFR, trends, users tab) in one round trip if not parallelized | 1 | 3 | **3** | Manual timing baseline once implemented; escalate to R-008-style perf test if breached |

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
| Security — Admin authz | Only `admin`-role users may call any analytics procedure (existing + new) | R-001 | API tests: 401/403 for unauthenticated/non-admin callers on every analytics endpoint | API test reports (Playwright request fixture) |
| Data Integrity — CEFR completeness | All 6 CEFR levels (A1–C2) always represented, including zero-count levels | R-002 | API test: partial-coverage seed data; assert full level list returned | API test report |
| Data Integrity — Active users definition | Only users with a `view` interaction inside the selected window counted | R-003 | API test: boundary-dated seed rows (inside/outside window, wrong action type) | API test report |
| Data Integrity — Preference completion denominator | Denominator = all users, not just users with a preference row | R-004 | API test: users with no preference row included in denominator | API test report |
| Maintainability — Session duration data availability | **UNKNOWN** — no instrumentation currently exists; threshold cannot be defined until a data source is chosen | R-005 | ASR clarification with PM/architect before implementation; defer test design for this sub-metric until resolved | Design decision doc; then API test once instrumented |
| Performance — Admin analytics dashboard load | p95 ≤ 3s per AC | R-008, R-012 | Manual baseline once implemented; escalate to k6/Lighthouse if consistently breached | Timing baseline report; Lighthouse report if added |

**Unknown thresholds:**
- Average-session-duration data source is undefined (R-005) — this blocks writing a concrete test until PM/architect decides on instrumentation or descoping.
- "Trend indicator" comparison formula (R-007) is unspecified — assume 7d-vs-prior-7d percentage change unless PM specifies otherwise; update tests once confirmed.
- No PRD-level SLA exists for the underlying `adminStats`-style query at current or projected data volumes — R-008/R-012 perf checks are baseline-only, not gated on a hard number yet.

---

## Entry Criteria

- [ ] RE-6.1 story spec reviewed and agreed by QA, Dev, PM
- [ ] R-005 (session duration data source) resolved or explicitly descoped by PM/architect before test-writing begins for that sub-metric
- [ ] R-007 (trend indicator formula) and unknown thresholds clarified with PM
- [ ] Test environment with PostgreSQL accessible, seeded with admin + non-admin users, content across all 6 CEFR levels, and dated interaction rows spanning ≥ 2 comparison periods
- [ ] Playwright API test fixtures (auth session, request context) confirmed working, matching existing `tests/api/` pattern

## Exit Criteria

- [ ] All P0 tests passing (100%)
- [ ] All P1 tests passing (≥ 95%)
- [ ] R-002 (CEFR zero-count levels) verified by API test
- [ ] R-003 (active-users definition) and R-004 (preference completion denominator) verified by API test
- [ ] R-005 (session duration) either implemented and tested, or formally descoped with documented rationale — not shipped as a fabricated metric
- [ ] No open HIGH or CRITICAL bugs
- [ ] Existing `adminStats` regression (counts, recent interactions, likes-based popular content) passing unchanged

---

## Test Coverage Plan

### P0 (Critical) — Run on every commit

**Criteria**: Authorization security + data-correctness of the epic's defining metrics; HIGH (≥ 6) risk; no workaround if broken.

| ID | Requirement | AC | Test Level | Risk Link | Test Count | Notes |
|---|---|---|---|---|---|---|
| RE6.1-API-001 | Non-admin authenticated user receives 403 on any new analytics endpoint | RE-6.1 (implicit admin gating) | API | R-001 | 1 | Cover CEFR, trends, and users-tab endpoints in one parameterized test or 3 discrete cases |
| RE6.1-API-002 | Unauthenticated user receives 401 on any new analytics endpoint | RE-6.1 (implicit admin gating) | API | R-001 | 1 | Same coverage as above |
| RE6.1-API-003 | CEFR distribution includes all 6 levels; levels with zero content report `count: 0` | RE-6.1 AC-1, AC-2 | API | R-002 | 1 | Seed content covering 4/6 levels; assert full 6-level response |
| RE6.1-API-004 | Active users metric counts only users with a `view` interaction inside the selected window | RE-6.1 AC-5 | API | R-003 | 1 | Seed in-window view, out-of-window view, in-window non-view action; assert correct count |
| RE6.1-API-005 | Preference completion rate uses total user count as denominator, including users with no preference row | RE-6.1 AC-5 | API | R-004 | 1 | Seed user with no row, user with 2 interests, user with 3+ interests; assert rate = 1/3 |
| RE6.1-API-006 | Average likes per item returns `0` (not `NaN`) when content count is 0 | RE-6.1 AC-1 | API | R-006 | 1 | Empty-content environment |

**Total P0**: 6 tests, ~10–14 hours

---

### P1 (High) — Run on PR to main

**Criteria**: Core feature functionality + medium/high risk; primary dashboard journeys.

| ID | Requirement | AC | Test Level | Risk Link | Test Count | Notes |
|---|---|---|---|---|---|---|
| RE6.1-API-007 | Top-20 content sorted by `likes` returns correct order and counts | RE-6.1 AC-3 | API | R-010 | 1 | Extend existing likes-only query to top-20 limit |
| RE6.1-API-008 | Top-20 content sorted by `completions` returns correct order and counts, consistent shape with likes-sort | RE-6.1 AC-3 | API | R-010 | 1 | Same seeded dataset as RE6.1-API-007 for direct comparison |
| RE6.1-API-009 | Interaction trend endpoint (7d range) returns daily buckets of views/likes/completions/dismisses | RE-6.1 AC-4 | API | R-008 | 1 | Seed dated interactions across 7 distinct days |
| RE6.1-API-010 | Interaction trend endpoint honors 30d and 90d ranges with correct bucket count and date bounds | RE-6.1 AC-4 | API | R-008 | 1 | Parameterized over both ranges |
| RE6.1-API-011 | Week-over-week comparison computed correctly given two full weeks of data | RE-6.1 AC-4 | API | — | 1 | Seed distinct counts in current vs. prior week; assert % change |
| RE6.1-API-012 | Week-over-week comparison handles first-week case (no prior-period data) without crash | RE-6.1 AC-4 | API | R-009 | 1 | Prior period has zero rows; assert graceful `null`/`0%`, not an error |
| RE6.1-E2E-001 | Analytics dashboard renders totals, CEFR chart, top-content table, trend chart, and Users tab | RE-6.1 AC-1 through AC-5 | E2E (web) | — | 1 | Playwright web smoke; navigate as admin, assert each section renders with seeded data |

**Total P1**: 7 tests, ~9–13 hours

---

### P2 (Medium) — Run nightly

**Criteria**: Secondary flows + low/medium risk + edge cases.

| ID | Requirement | AC | Test Level | Risk Link | Test Count | Notes |
|---|---|---|---|---|---|---|
| RE6.1-API-013 | Trend indicator on top-content items computed per agreed formula, or explicitly marked unavailable if unresolved | RE-6.1 AC-3 | API | R-007 | 1 | Pending PM clarification (see Assumptions) |
| RE6.1-E2E-002 | Date-range selector (7d/30d/90d) switches and chart data updates accordingly | RE-6.1 AC-4 | E2E (web) | — | 1 | Playwright web; assert chart re-fetches on selector change |
| RE6.1-E2E-003 | Skeleton loading states shown while analytics data fetches | RE-6.1 AC-6 | E2E (web) | R-011 | 1 | Reuses existing `isLoading` skeleton pattern |
| RE6.1-PERF-001 | Analytics dashboard loads within 3s under a moderate seeded dataset (e.g., 10k interactions) | RE-6.1 AC-6 | Manual/Perf | R-012 | 1 | Baseline timing check, not a hard CI gate yet |
| RE6.1-API-014 | Session duration sub-metric: documented as descoped, or tested against agreed data source if implemented | RE-6.1 AC-5 | API | R-005 | 1 | Blocked on entry-criteria resolution; write only once source is decided |

**Total P2**: 5 tests, ~5–9 hours

---

### P3 (Low) — Run on-demand

**Criteria**: Nice-to-have, exploratory, edge cases with minimal risk.

| ID | Requirement | Test Level | Test Count | Notes |
|---|---|---|---|---|
| RE6.1-API-015 | Trend/CEFR endpoints benchmarked against a large dataset (100k+ interactions) | API/Perf | 1 | Exploratory; informs whether R-008 index work is needed |
| RE6.1-E2E-004 | Empty-state rendering when no interactions exist yet (fresh environment) | E2E (web) | 1 | Verify no crash/`NaN` rendering across all widgets |

**Total P3**: 2 tests, ~1–2 hours

---

## Execution Order

### Smoke Tests (< 3 min)

- [ ] RE6.1-API-001: Non-admin 403 on analytics endpoints (20s)
- [ ] RE6.1-API-003: CEFR distribution includes all 6 levels (30s)
- [ ] RE6.1-API-007: Top-20 by likes (30s)
- [ ] RE6.1-E2E-001: Dashboard renders all sections (60s)

**Total**: 4 scenarios

### P0 Tests (< 10 min)

- [ ] RE6.1-API-001–002: Auth coverage on analytics endpoints
- [ ] RE6.1-API-003: CEFR zero-count levels
- [ ] RE6.1-API-004: Active users window definition
- [ ] RE6.1-API-005: Preference completion denominator
- [ ] RE6.1-API-006: Average-likes divide-by-zero guard

**Total**: 6 scenarios

### P1 Tests (< 25 min)

- [ ] RE6.1-API-007 to RE6.1-API-008: Top-20 sort modes
- [ ] RE6.1-API-009 to RE6.1-API-010: Interaction trend ranges
- [ ] RE6.1-API-011 to RE6.1-API-012: Week-over-week comparison
- [ ] RE6.1-E2E-001: Full dashboard smoke

**Total**: 7 scenarios

### P2/P3 Tests (< 30 min)

- [ ] RE6.1-API-013: Trend indicator formula
- [ ] RE6.1-E2E-002: Date-range selector
- [ ] RE6.1-E2E-003: Skeleton states
- [ ] RE6.1-PERF-001: 3s load baseline
- [ ] RE6.1-API-014: Session duration (conditional on entry criteria)
- [ ] RE6.1-API-015: Large-dataset benchmark (on-demand)
- [ ] RE6.1-E2E-004: Empty-state rendering (on-demand)

**Total**: 7 scenarios

---

## Resource Estimates

### Test Development Effort

| Priority | Count | Hours/Test | Total Hours | Notes |
|---|---|---|---|---|
| P0 | 6 | 1.5–2.5 | 10–14 | Auth setup + boundary/null-handling assertions |
| P1 | 7 | 1.0–1.5 | 9–13 | Standard API coverage + one E2E smoke |
| P2 | 5 | 1.0–2.0 | 5–9 | Edge cases, UI interaction, manual perf baseline |
| P3 | 2 | 0.5–1.0 | 1–2 | Exploratory |
| **Total** | **20** | **—** | **25–38** | **~3–5 dev-days** |

### Prerequisites

**Test Data:**
- `adminUser` / `nonAdminUser` fixtures (reuse existing pattern from Epic RE-1 test design)
- Content items seeded across all 6 CEFR levels, with at least 2 levels intentionally left at zero for R-002 coverage
- `userInteraction` rows with controlled `createdAt` timestamps spanning ≥ 2 weeks, covering `view`, `like`, `complete`, `dismiss` actions
- Users with no `userPreference` row, with 1–2 interests, and with ≥ 3 interests for R-004 coverage

**Tooling:**
- Playwright API test fixtures (`request` context) — matches existing pattern in `tests/api/`
- Playwright E2E with web browser — matches existing pattern in `tests/e2e/`
- Direct DB seeding via test fixtures/factories for date-controlled interaction rows

**Environment:**
- Test PostgreSQL with migrations applied
- Hono server running against test DB
- Admin + non-admin users seeded with known credentials

---

## Quality Gate Criteria

### Pass/Fail Thresholds

- **P0 pass rate**: 100% (no exceptions — R-002 defeats the epic's core purpose if unresolved)
- **P1 pass rate**: ≥ 95% (waivers require documented justification)
- **P2/P3 pass rate**: ≥ 90% (informational)
- **High-risk mitigations (R-001 through R-005)**: 100% complete, or R-005 formally descoped with PM sign-off, before release

### Coverage Targets

- **Security (SEC) scenarios**: 100% — every analytics endpoint tested for 401/403
- **Critical data-correctness paths (CEFR, active users, preference completion)**: 100%
- **Business logic (trend indicators, WoW comparison)**: ≥ 70%
- **Edge cases**: ≥ 50%

### Non-Negotiable Requirements

- [ ] All P0 tests pass, especially R-002 (CEFR zero-count levels)
- [ ] R-001 (admin gating) verified on every analytics endpoint before RE-6.1 closes
- [ ] R-003 (active users) and R-004 (preference completion) verified by API test with null/boundary seed data
- [ ] R-005 (session duration) resolved — implemented-and-tested or explicitly descoped, never shipped as a guessed number
- [ ] No HIGH or CRITICAL bugs open at time of epic close
- [ ] Existing `adminStats` regression passing unchanged

---

## Mitigation Plans

### R-002: CEFR distribution omits zero-count levels — Score: 9

**Mitigation Strategy:** Build the CEFR distribution by starting from a fixed array of all 6 levels (`["A1","A2","B1","B2","C1","C2"]`) and left-joining/merging counts from the `GROUP BY` query, defaulting missing levels to `0`, rather than returning only levels present in the query result.
**Owner:** Dev + QA
**Timeline:** Before RE-6.1 release
**Status:** Planned
**Verification:** RE6.1-API-003 passes with a seed set covering only 4 of 6 levels

### R-001: New analytics endpoints not gated to admin — Score: 6

**Mitigation Strategy:** Every new analytics procedure (CEFR, trends, users-tab) must use `adminProcedure`, matching the existing `adminStats` pattern in `packages/api/src/routers/recommendations.ts`.
**Owner:** Dev + QA
**Timeline:** Before RE-6.1 release
**Status:** Planned
**Verification:** RE6.1-API-001, RE6.1-API-002 pass on every new endpoint

### R-003: Active-users definition ambiguity — Score: 6

**Mitigation Strategy:** Explicitly define "active user" as a distinct `userId` with at least one `userInteraction` row where `action = 'view'` and `createdAt` falls within the last 7 days. Document this definition in code comments since no dedicated "feed view" event exists.
**Owner:** Dev + QA
**Timeline:** Before RE-6.1 release
**Status:** Planned
**Verification:** RE6.1-API-004 passes with boundary-dated and wrong-action seed rows

### R-004: Preference completion denominator excludes users with no row — Score: 6

**Mitigation Strategy:** Compute completion rate as `(count of users with interests.length >= 3) / (total user count)`, using a `LEFT JOIN` from `user` to `userPreference` (not an inner join), so users without a preference row are counted in the denominator with 0 interests.
**Owner:** Dev + QA
**Timeline:** Before RE-6.1 release
**Status:** Planned
**Verification:** RE6.1-API-005 passes with a no-preference-row user included in the denominator

### R-005: Average session duration has no backing data — Score: 6

**Mitigation Strategy:** Escalate to PM/architect before implementation begins. Either instrument a real activity-duration signal (e.g., update `session.updatedAt` on meaningful client activity, or add a dedicated event), or explicitly descope this sub-metric from RE-6.1 and document the limitation in the epic.
**Owner:** Dev + PM
**Timeline:** Before RE-6.1 implementation starts (blocks entry criteria)
**Status:** Open — requires a decision before test-writing for this sub-metric
**Verification:** Either RE6.1-API-014 passes against an agreed data source, or a descoping decision is recorded in the story

---

## Assumptions and Dependencies

### Assumptions

1. `adminProcedure` in `packages/api/src/index.ts` remains the correct, already-verified mechanism for admin-role gating (established in Epic RE-1); no new auth infrastructure is needed for RE-6.
2. "Trend indicator" formula is assumed to be a 7-day-vs-prior-7-day percentage change unless PM specifies otherwise (R-007) — tests will be updated once confirmed.
3. "Active user" is assumed to mean a distinct `userId` with a `view`-action `userInteraction` row in the trailing 7 days, since no separate feed-view event exists (R-003).
4. Average-session-duration is assumed to be either newly instrumented or formally descoped before RE-6.1 ships (R-005) — this test design does not assume a specific implementation.
5. The existing `tests/api/` and `tests/e2e/` Playwright patterns (established in prior epics) will be reused rather than a new test harness.

### Dependencies

1. Resolution of R-005 (session-duration data source or descoping decision) — blocks RE6.1-API-014
2. Resolution of R-007 (trend indicator formula) — blocks RE6.1-API-013
3. Seed data fixtures for content across all 6 CEFR levels and dated interaction rows spanning ≥ 2 weeks — required by most P0/P1 tests
4. Existing `adminStats` implementation and `adminProcedure` gating — reused as the foundation for new endpoints

### Risks to Plan

- **Risk**: PM/architect decision on session duration is delayed past the RE-6.1 implementation start
  - **Impact**: RE6.1-API-014 cannot be written; risk of the team shipping a fabricated metric under schedule pressure
  - **Contingency**: Treat R-005 as a release blocker per the exit criteria; descope the sub-metric explicitly rather than fabricate data

- **Risk**: "Trend indicator" formula is decided very late in implementation
  - **Impact**: RE6.1-API-013 may need to be rewritten after initial implementation
  - **Contingency**: Demote to P3 if the formula remains undecided by test-execution time

---

## Interworking & Regression

| Service/Component | Impact | Regression Scope |
|---|---|---|
| **oRPC `recommendationsRouter` (`adminStats`)** | Extended or supplemented with new CEFR/trend/users-tab procedures | Existing `adminStats` shape (counts, recentInteractions, popularContent) must remain unchanged for current UI consumers |
| **`apps/web/src/app/admin/analytics/page.tsx`** | New CEFR chart, top-20 table, trend chart, and Users tab added alongside existing widgets | Existing action-distribution grid and system-overview grid must continue rendering unchanged |
| **`admin/layout.tsx` role gate** | No change expected — existing server-side `session.user.role !== "admin"` redirect already covers the analytics route | Existing admin-redirect behavior verified as still functioning (regression smoke) |
| **`userInteraction` / `contentItem` tables (Epic RE-1)** | Read-only consumption for CEFR distribution and top-content queries | No schema changes required unless session-duration instrumentation (R-005) adds a new column |
| **`userPreference` table** | Read for preference-completion-rate metric | Must handle absent rows correctly (R-004); no write path from this epic |
| **`session` table (better-auth)** | Read (if R-005 is resolved via existing columns) or extended (if new instrumentation is added) | If a new column/event is added, existing auth session flows must not regress |

---

## Follow-on Workflows (Manual)

- Escalate R-005 (session duration) and R-007 (trend indicator formula) to PM/architect immediately — both block portions of test-writing.
- Run `*atdd` on P0 scenarios (R-001 admin gating, R-002 CEFR completeness, R-003/R-004 null-handling) to generate failing RED-phase API tests as soon as endpoint contracts are agreed.
- Run `*automate` for broader coverage once RE-6.1 implementation lands.
- Run `*nfr-assess` once implementation evidence (API test reports, dashboard timing baseline) is available.

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
- `nfr-criteria.md` — Security/performance NFR validation patterns

### Related Documents

- Epic: `_bmad-output/planning-artifacts/epics-recommendation-engine.md` — Epic RE-6 section
- Sprint status: `_bmad-output/implementation-artifacts/sprint-status.yaml` — `epic-re-6: backlog`, `re-6-1-admin-content-analytics: backlog`
- GH Issue: RE-6.1 → #53
- Existing partial implementation: `packages/api/src/routers/recommendations.ts` (`adminStats`, line 984), `apps/web/src/app/admin/analytics/page.tsx`
- Prior test design precedent: `_bmad-output/test-artifacts/test-design/test-design-epic-RE-1.md`

---

**Generated by**: BMad TEA Agent - Test Architect Module
**Workflow**: `bmad-testarch-test-design`
**Version**: 4.0 (BMad v6)
