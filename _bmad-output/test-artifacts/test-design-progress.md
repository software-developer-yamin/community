---
workflowStatus: 'completed'
totalSteps: 5
stepsCompleted: ['step-01-detect-mode', 'step-02-load-context', 'step-03-risk-and-testability', 'step-04-coverage-plan', 'step-05-generate-output']
lastStep: 'step-05-generate-output'
nextStep: ''
lastSaved: '2026-07-05'
---

# Test Design Progress — Epic RE-6: Admin Content Management & Analytics

## Step 1: Mode Detection

- Mode selected: **Epic-Level**
- Reason: Epic argument explicitly provided ("epic-re-6"); `sprint-status.yaml` exists and lists `epic-re-6: backlog`, `re-6-1-admin-content-analytics: backlog`
- Stories in scope: RE-6.1 (Admin Content Analytics)
- Prerequisites confirmed: epic + story with acceptance criteria available in `epics-recommendation-engine.md`

## Step 2: Context Loaded

- Config: `tea_use_playwright_utils: true`, `tea_use_pactjs_utils: false`, `tea_browser_automation: auto`, `test_stack_type: auto`
- Stack detected: **fullstack** (Next.js web + Expo native + Hono server); RE-6 admin panel is web-only
- Epic/story source: `_bmad-output/planning-artifacts/epics-recommendation-engine.md`
- Existing test patterns: `tests/api/` (Playwright API) + `tests/e2e/` (Playwright E2E web)
- Existing partial implementation found: `recommendations.adminStats` (adminProcedure-gated) in `packages/api/src/routers/recommendations.ts`; `apps/web/src/app/admin/analytics/page.tsx` renders a subset of required widgets (totals, likes-based top content, action distribution) — CEFR chart, top-20/trend indicators, date-range trend chart, and Users tab are all net-new
- Knowledge fragments loaded: `risk-governance.md`, `probability-impact.md`, `test-levels-framework.md`, `test-priorities-matrix.md`, `nfr-criteria.md`
- Reused prior epic-level test design pattern from Epic RE-1 (`test-design-epic-RE-1.md`)

## Step 3: Risk and Testability Assessment

- **Critical risk (R-002, score 9):** CEFR distribution query (naive GROUP BY) omits zero-count levels, defeating the AC's stated purpose of surfacing content gaps
- **High risks (score 6):** R-001 (new analytics endpoints not admin-gated), R-003 (active-users definition ambiguity — no dedicated feed-view event), R-004 (preference-completion denominator excludes users with no `userPreference` row), R-005 (average session duration has no backing data in `session` schema — ASR, escalated to PM/architect)
- **Medium risks (score 4):** R-006 (avg-likes divide-by-zero), R-007 (trend indicator formula undefined), R-008 (trend query perf/index — composite index is `(userId, createdAt)`, not bare `createdAt`), R-009 (week-over-week first-period edge case), R-010 (dual sort-mode consistency between likes/completions)
- **Low risks (score 2–3):** R-011 (skeleton states, established existing pattern), R-012 (≤3s load NFR once 4+ widgets aggregate)
- NFR scope: security (admin authz on new endpoints), data integrity (CEFR completeness, active-users/preference-completion null-handling), performance (≤3s dashboard load), maintainability (session-duration data availability — UNKNOWN, escalated)

## Step 4: Coverage Plan

- P0: 6 tests — admin gating on new endpoints, CEFR zero-count levels, active-users window definition, preference-completion denominator, avg-likes divide-by-zero guard
- P1: 7 tests — top-20 sort by likes/completions, interaction trend ranges (7d/30d/90d), week-over-week comparison (happy path + first-period edge), full dashboard E2E smoke
- P2: 5 tests — trend-indicator formula (pending clarification), date-range selector E2E, skeleton states E2E, ≤3s load baseline, session-duration test (conditional on R-005 resolution)
- P3: 2 tests — large-dataset benchmark, empty-state E2E
- Execution model: PR (P0+P1), Nightly (P2), On-demand (P3)
- Estimated effort: 25–38 hours (~3–5 dev-days)

## Step 5: Output Generated

- Output: `_bmad-output/test-artifacts/test-design/test-design-epic-RE-6.md`
- Execution mode: sequential (config: auto)
- Key gate thresholds: P0 = 100%, P1 ≥ 95%, SEC tests 100%
- Open assumptions/blockers: R-005 (session duration data source or explicit descoping) and R-007 (trend indicator formula) require PM/architect decisions before full test-writing can proceed for those specific scenarios
