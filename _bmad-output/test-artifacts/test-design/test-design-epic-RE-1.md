---
workflowStatus: 'completed'
totalSteps: 5
stepsCompleted: ['step-01-detect-mode', 'step-02-load-context', 'step-03-risk-and-testability', 'step-04-coverage-plan', 'step-05-generate-output']
lastStep: 'step-05-generate-output'
nextStep: ''
lastSaved: '2026-06-30'
inputDocuments:
  - '_bmad-output/project-context.md'
  - '_bmad-output/planning-artifacts/epics-recommendation-engine.md'
  - '_bmad/tea/config.yaml'
---

# Test Design: Epic RE-1 — Content Library Management

**Date:** 2026-06-30
**Author:** Yamin
**Status:** Draft

---

## Executive Summary

**Scope:** Epic-level test design for Epic RE-1 — Content Library Management

Epic RE-1 delivers the admin-facing content library CRUD surface that powers the recommendation engine's content inventory. Three stories are in scope:

- **Story RE-1.1** — Update Content Item: admin updates metadata; embedding flagged for recomputation
- **Story RE-1.2** — Bulk Content Import: CSV/JSON file upload with partial-success semantics and background processing
- **Story RE-1.3** — Secure Content Creation: gate `createContent` to admin role only (addresses SIR-2)

The most critical risk in this epic is the known, unfixed SIR-2 gap: `createContent` is currently unauthenticated or accessible to non-admin users, directly threatening content library integrity and downstream recommendation quality. All three stories touch admin-only authorization; authorization coverage is therefore a P0 requirement across every story.

**Risk Summary:**

- Total risks identified: 9
- High-priority risks (score ≥ 6): 5
- Critical categories: SEC (3), DATA (2)

**Coverage Summary:**

- P0 scenarios: 7 (~14–20 hours)
- P1 scenarios: 8 (~8–12 hours)
- P2 scenarios: 5 (~3–6 hours)
- P3 scenarios: 2 (~0.5–1 hour)
- **Total effort**: ~25.5–39 hours (~3–5 dev-days)

---

## Not in Scope

| Item | Reasoning | Mitigation |
|---|---|---|
| **Content embedding recomputation execution (FR-7)** | RE-1.1 only flags embedding for recomputation; actual recompute is Epic RE-2 | Test flag is persisted; defer compute test to RE-2 design |
| **Recommendation scoring after update** | Scoring pipeline is Epic RE-3 | Verify interactions/scores are preserved unchanged; scoring covered in RE-3 |
| **Native (Expo) UI for content management** | Architecture: admin panel is web-only (Next.js); no mobile admin surface | N/A |
| **File format support beyond CSV** | Story RE-1.2 ACs reference CSV with defined columns; JSON import not specified with schema | Scope JSON import in future story if added |
| **Detox / native E2E automation** | No native admin surface for this epic | N/A |
| **Performance load testing of bulk import** | No NFR threshold defined for bulk import in PRD | Add performance test once threshold is specified |
| **FR-1, FR-2, FR-3 (already implemented)** | Create, browse, filter, delete are implemented per requirements inventory | Regression-smoke only; no new test design needed |

---

## Risk Assessment

### High-Priority Risks (Score ≥ 6)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner | Timeline |
|---|---|---|---|---|---|---|---|---|
| R-001 | SEC | `createContent` is not gated to admin role (SIR-2 known gap). Any authenticated non-admin user can create content, polluting the library and corrupting recommendation engine training data | 3 | 3 | **9** | API tests verify: admin 201, non-admin 403, unauthenticated 401. Must be implemented before RE-1.3 ships | QA + Dev | Before RE-1.3 release |
| R-002 | SEC | `updateContent` endpoint for RE-1.1 is new; if admin gating is not applied consistently, non-admin users can corrupt content metadata | 2 | 3 | **6** | API tests: non-admin authenticated user receives 403 on PUT/PATCH to content update endpoint | QA + Dev | Before RE-1.1 release |
| R-003 | SEC | Bulk import endpoint (RE-1.2) must be admin-only; same authorization gap as SIR-2 if not explicitly scoped | 2 | 3 | **6** | API tests: non-admin 403, unauthenticated 401 on bulk import endpoint | QA + Dev | Before RE-1.2 release |
| R-004 | DATA | After a title or description update (RE-1.1), the embedding recomputation flag is not persisted. Old embedding drives recommendations indefinitely, causing semantic drift without any visible signal | 2 | 3 | **6** | API test: after update with title/description change, assert DB column (e.g., `embeddingStatus = 'stale'` or equivalent flag) is set; assert old embedding ID still present | QA + Dev | Before RE-1.1 release |
| R-005 | DATA | Bulk import partial-success semantics (47/50 valid rows): if not implemented as row-by-row commit with independent error tracking, a DB constraint failure on one row can roll back all valid rows already processed | 2 | 3 | **6** | API test: 50-item CSV with 3 deliberately invalid rows; assert exactly 47 rows created in DB, 3 errors returned with row-specific messages | QA + Dev | Before RE-1.2 release |

### Medium-Priority Risks (Score 3–5)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner |
|---|---|---|---|---|---|---|---|
| R-006 | BUS | Duplicate title detection in bulk import: when admin chooses "create anyway" for a flagged duplicate, UUID collision or logic error may create truly duplicate content with same metadata | 2 | 2 | **4** | API test: submit CSV with duplicate title, assert system flags it; assert create-anyway creates distinct UUID; assert skip omits row | QA |
| R-007 | TECH | Input validation schema for `updateContent` (RE-1.1): Zod schema may not enforce `title ≤ 200 chars`, allowing oversized data to reach the database | 2 | 2 | **4** | API test: update with title of 201+ chars; assert 422/400 with field-level error message | QA + Dev |

### Low-Priority Risks (Score 1–2)

| Risk ID | Category | Description | Probability | Impact | Score | Action |
|---|---|---|---|---|---|---|
| R-008 | OPS | Background bulk import loses state on server restart: user returns to page and sees no progress indicator | 1 | 2 | **2** | Monitor — document expected UX behavior for incomplete import after restart |
| R-009 | BUS | Existing user interactions, recommendation scores, and embeddings must survive a metadata-only content update (RE-1.1). If update triggers a cascade delete/re-insert, scores are lost | 1 | 3 | **3** | API test: verify interaction counts and score cache rows are unchanged after metadata update that does not touch title/description |

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
| Security — Admin authz | Only users with `admin` role may call `createContent`, `updateContent`, `bulkImport` | R-001, R-002, R-003 | API tests: 401/403 for non-admin and unauthenticated callers on all three endpoints | API test reports (Playwright request fixture) |
| Security — Input sanitization | Title ≤ 200 chars; all fields validated before DB write | R-007 | API tests: boundary-value inputs; assert validation error returned, no DB mutation | API test report |
| Data Integrity — Embedding flag | Embedding recomputation flag set on title/description change | R-004 | API test: assert DB flag/status column after update | API test report + DB query assertion |
| Data Integrity — Partial import | Bulk import commits valid rows independently; invalid rows tracked with per-row errors | R-005 | API test: mixed-validity CSV; count created rows; inspect error array | API test report |
| Performance — Admin page load | p95 ≤ 2s (NFR-4 from PRD, admin web surface) | — | Manual baseline + Lighthouse CI scan on content management page | Lighthouse report; no automated load test planned at this stage |

**Unknown thresholds:**
- Bulk import: no maximum row count per file defined in PRD. Assumed reasonable (≤ 1,000 rows). Clarify with PM before implementation.
- Background import job polling interval: not specified. Document expected UX for long-running imports.
- No SLA defined for `updateContent` response time at this stage.

---

## Entry Criteria

- [ ] RE-1.1, RE-1.2, RE-1.3 story specs reviewed and agreed by QA, Dev, PM
- [ ] Test environment with PostgreSQL accessible and seeded with admin + non-admin users
- [ ] `adminProcedure` (oRPC) reviewed to confirm role-check implementation
- [ ] Playwright API test fixtures (auth session, request context) confirmed working against test environment
- [ ] Bulk import endpoint design agreed (multipart upload vs. JSON body; background job mechanism)

## Exit Criteria

- [ ] All P0 tests passing (100%)
- [ ] All P1 tests passing (≥ 95%)
- [ ] R-001 (SIR-2 authorization gap) resolved and verified by API test
- [ ] R-004 (embedding recomputation flag) verified by DB assertion
- [ ] R-005 (partial import semantics) verified by row-count assertion
- [ ] No open HIGH or CRITICAL bugs
- [ ] Content library regression (FR-1/FR-2/FR-3 smoke) passing

---

## Test Coverage Plan

### P0 (Critical) — Run on every commit

**Criteria**: Authorization security + data integrity + core new functionality; HIGH (≥ 6) risk; no workaround if broken.

| ID | Requirement | AC | Test Level | Risk Link | Test Count | Notes |
|---|---|---|---|---|---|---|
| RE1.3-API-001 | Admin creates content successfully | RE-1.3 AC-1 | API | R-001 | 1 | Assert 201 + UUID in response |
| RE1.3-API-002 | Non-admin authenticated user receives 403 on createContent | RE-1.3 AC-2 | API | R-001 | 1 | Assert 403 + content not created |
| RE1.3-API-003 | Unauthenticated user receives 401 on createContent | RE-1.3 AC-3 | API | R-001 | 1 | Assert 401 |
| RE1.1-API-001 | Non-admin authenticated user receives 403 on updateContent | RE-1.1 AC-3 | API | R-002 | 1 | Assert 403 |
| RE1.2-API-001 | Non-admin authenticated user receives 403 on bulk import | RE-1.2 implicit SIR-2 | API | R-003 | 1 | Assert 403 |
| RE1.1-API-002 | Embedding flagged for recomputation after title/description update | RE-1.1 AC-2 | API | R-004 | 1 | Assert `embeddingStatus` flag in DB after update |
| RE1.2-API-002 | Partial import: 47 valid / 3 invalid → 47 created, 3 errors | RE-1.2 AC-2 | API | R-005 | 1 | Count DB rows + assert error array length = 3 |

**Total P0**: 7 tests, ~14–20 hours

---

### P1 (High) — Run on PR to main

**Criteria**: Core feature functionality + medium risk; important user journeys.

| ID | Requirement | AC | Test Level | Risk Link | Test Count | Notes |
|---|---|---|---|---|---|---|
| RE1.1-API-003 | Admin updates title, description, type, CEFR, tags, metadata — item updated in place | RE-1.1 AC-1 | API | — | 1 | Assert all fields reflected in GET response |
| RE1.1-API-004 | Interactions, embeddings, scores preserved after metadata-only update | RE-1.1 AC-1 | API | R-009 | 1 | Seed interaction + score rows; update; assert rows unchanged |
| RE1.1-API-005 | Old embedding remains active until new one is computed (flag set, embedding ID not cleared) | RE-1.1 AC-2 | API | R-004 | 1 | Assert `embeddingId` still set after update; only flag changed |
| RE1.1-API-006 | Update rejected with validation error for title > 200 chars | RE-1.1 AC-4 | API | R-007 | 1 | Assert 400/422 with field-level error |
| RE1.2-API-003 | Full valid CSV: each row imported with UUID and timestamp | RE-1.2 AC-1 | API | — | 1 | 5–10 row clean CSV; assert created items count matches |
| RE1.2-API-004 | Duplicate title flagged; admin can choose skip or create | RE-1.2 AC-4 | API | R-006 | 2 | One test per choice (skip / create-anyway); assert correct outcome |
| RE1.3-API-004 | Admin deletes content just created via createContent; adminDeleteContent works | RE-1.3 AC-4 | API | — | 1 | Create then delete; assert 200 + item removed |

**Total P1**: 8 tests, ~8–12 hours

---

### P2 (Medium) — Run nightly

**Criteria**: Secondary flows + low/medium risk + edge cases.

| ID | Requirement | AC | Test Level | Risk Link | Test Count | Notes |
|---|---|---|---|---|---|---|
| RE1.2-API-005 | Unauthenticated user receives 401 on bulk import | RE-1.2 implicit | API | R-003 | 1 | — |
| RE1.2-E2E-001 | Background import: navigate away and return; import completed in background | RE-1.2 AC-3 | E2E (web) | R-008 | 1 | Playwright web E2E; verify results page shows completed state |
| RE1.1-API-007 | Update content with no title/description change: embedding flag NOT set | RE-1.1 AC-2 (negative) | API | R-004 | 1 | Only tag/type change; assert embedding flag unchanged |
| RE1.2-API-006 | Import with all invalid rows: zero items created, all rows reported as errors | RE-1.2 AC-2 (edge) | API | — | 1 | Assert 0 created, error array = total row count |
| RE1.1-API-008 | Regression: existing FR-1 createContent, FR-2 browse, FR-3 delete still function | FR-1/FR-2/FR-3 | API | — | 1 | Smoke re-run of pre-existing implemented FRs |

**Total P2**: 5 tests, ~3–6 hours

---

### P3 (Low) — Run on-demand

**Criteria**: Nice-to-have, exploratory, edge cases with minimal risk.

| ID | Requirement | Test Level | Test Count | Notes |
|---|---|---|---|---|
| RE1.2-API-007 | Import with maximum expected row count (e.g., 1,000 rows): all rows processed within reasonable time | API | 1 | Pending PM clarification of max row limit |
| RE1.1-API-009 | Update content with identical data (no changes): idempotent — same state, embedding flag not set | API | 1 | Guard against unnecessary re-flagging |

**Total P3**: 2 tests, ~0.5–1 hour

---

## Execution Order

### Smoke Tests (< 3 min)

- [ ] RE1.3-API-001: Admin creates content (30s)
- [ ] RE1.3-API-002: Non-admin 403 on createContent (20s)
- [ ] RE1.1-API-003: Admin updates content item (30s)
- [ ] RE1.2-API-003: Full valid CSV import (30s)

**Total**: 4 scenarios

### P0 Tests (< 10 min)

- [ ] RE1.3-API-001–003: Auth coverage on createContent (E2E of SIR-2)
- [ ] RE1.1-API-001: Non-admin 403 on updateContent
- [ ] RE1.2-API-001: Non-admin 403 on bulk import
- [ ] RE1.1-API-002: Embedding flag set after title/description update
- [ ] RE1.2-API-002: Partial import 47/50 rows

**Total**: 7 scenarios

### P1 Tests (< 25 min)

- [ ] RE1.1-API-003 to RE1.1-API-006: Update content lifecycle
- [ ] RE1.2-API-003 to RE1.2-API-004: Bulk import happy path + duplicate handling
- [ ] RE1.3-API-004: Admin delete after create

**Total**: 8 scenarios

### P2/P3 Tests (< 30 min)

- [ ] RE1.2-API-005: Unauthenticated bulk import 401
- [ ] RE1.2-E2E-001: Background import E2E (web Playwright)
- [ ] RE1.1-API-007: No-flag-set on type/tag-only update
- [ ] RE1.2-API-006: All-invalid import
- [ ] RE1.1-API-008: Regression smoke
- [ ] RE1.2-API-007: Max-row import (on-demand)
- [ ] RE1.1-API-009: Idempotent update (on-demand)

**Total**: 7 scenarios

---

## Resource Estimates

### Test Development Effort

| Priority | Count | Hours/Test | Total Hours | Notes |
|---|---|---|---|---|
| P0 | 7 | 2.0–2.5 | 14–20 | Auth setup, DB assertions, embedding flag verification |
| P1 | 8 | 1.0–1.5 | 8–12 | Standard API coverage |
| P2 | 5 | 0.5–1.0 | 3–6 | Edge cases + 1 E2E |
| P3 | 2 | 0.25–0.5 | 0.5–1 | Exploratory |
| **Total** | **22** | **—** | **25.5–39** | **~3–5 dev-days** |

### Prerequisites

**Test Data:**
- `adminUser` fixture: seeded admin with valid session (reuse existing auth pattern from `loginAs` helper)
- `nonAdminUser` fixture: authenticated user without admin role
- Content item factory: title, description, type, cefrLevel, tags, sourceUrl, thumbnailUrl, duration
- Interaction/score row seeds: for preservation tests in RE-1.1-API-004
- CSV test files: clean (valid-only), mixed (valid + invalid), duplicate-title, all-invalid

**Tooling:**
- Playwright API test fixtures (`request` context) — matches existing pattern in `tests/api/`
- Playwright E2E with web browser — for RE1.2-E2E-001 (background import)
- Direct DB assertions via oRPC query or a test-only endpoint — for embedding flag verification

**Environment:**
- Test PostgreSQL with migration applied
- Hono server running against test DB
- Admin user seeded with known credentials
- Content schema includes `embeddingStatus` or equivalent recomputation flag column

---

## Quality Gate Criteria

### Pass/Fail Thresholds

- **P0 pass rate**: 100% (no exceptions — R-001/SIR-2 is a known BLOCK-level risk)
- **P1 pass rate**: ≥ 95% (waivers required for any failures with documented justification)
- **P2/P3 pass rate**: ≥ 90% (informational)
- **High-risk mitigations (R-001 through R-005)**: 100% complete or approved waivers before release

### Coverage Targets

- **Security (SEC) scenarios**: 100% — all three admin-only endpoints tested for 401/403
- **Critical paths**: ≥ 80%
- **Business logic**: ≥ 70%
- **Edge cases**: ≥ 50%

### Non-Negotiable Requirements

- [ ] All P0 tests pass (especially R-001 / SIR-2 auth gate)
- [ ] R-001 (createContent admin gate) verified by API test before any RE-1.3 story closes
- [ ] R-004 (embedding flag) verified by DB-level assertion before RE-1.1 story closes
- [ ] R-005 (partial import) verified by row-count assertion before RE-1.2 story closes
- [ ] No HIGH or CRITICAL bugs open at time of epic close
- [ ] Planned NFR evidence exists or `nfr-assess` has documented CONCERNS/waivers

---

## Mitigation Plans

### R-001: `createContent` not gated to admin (SIR-2) — Score: 9

**Mitigation Strategy:** Wrap `createContent` oRPC procedure with `adminProcedure` (the existing admin role check middleware in `packages/api/src/index.ts`). Verify via three API tests: admin 201, non-admin 403, unauthenticated 401.
**Owner:** Dev + QA
**Timeline:** Before RE-1.3 story release — this is the primary deliverable of RE-1.3
**Status:** Planned
**Verification:** RE1.3-API-001, RE1.3-API-002, RE1.3-API-003 all pass

### R-002: `updateContent` not gated to admin — Score: 6

**Mitigation Strategy:** Ensure new `updateContent` procedure uses `adminProcedure`. Include authorization test in RE-1.1 spec.
**Owner:** Dev + QA
**Timeline:** Before RE-1.1 release
**Status:** Planned
**Verification:** RE1.1-API-001 passes

### R-003: Bulk import endpoint not gated to admin — Score: 6

**Mitigation Strategy:** Bulk import oRPC procedure uses `adminProcedure`. Include authorization tests in RE-1.2 spec.
**Owner:** Dev + QA
**Timeline:** Before RE-1.2 release
**Status:** Planned
**Verification:** RE1.2-API-001 and RE1.2-API-005 pass

### R-004: Embedding recomputation flag not set on title/description update — Score: 6

**Mitigation Strategy:** `updateContent` business logic must check if `title` or `description` changed; if so, set `embeddingStatus = 'stale'` (or equivalent flag column) and retain existing `embeddingId`. Verify via DB assertion in test.
**Owner:** Dev + QA
**Timeline:** Before RE-1.1 release
**Status:** Planned
**Verification:** RE1.1-API-002 passes with DB assertion; RE1.1-API-005 confirms old embedding still present

### R-005: Bulk import partial-success semantics — Score: 6

**Mitigation Strategy:** Implement bulk import with row-by-row processing inside a loop (not a single DB transaction for all rows). Each valid row is committed independently. Invalid rows are collected into an error array and returned. Verify with mixed-validity CSV.
**Owner:** Dev + QA
**Timeline:** Before RE-1.2 release
**Status:** Planned
**Verification:** RE1.2-API-002 passes: 47 rows in DB, error array length = 3

---

## Assumptions and Dependencies

### Assumptions

1. `adminProcedure` in `packages/api/src/index.ts` is the correct mechanism for admin-role gating and is already tested for correctness in existing stories.
2. The content schema includes a column or field for embedding recomputation status (e.g., `embeddingStatus: 'current' | 'stale'`); if not, a DB migration is required before RE-1.1 tests can be written.
3. Bulk import will use a multipart form upload or JSON body with array of rows — exact transport not yet confirmed; test structure may need adjustment.
4. Maximum bulk import row count is ≤ 1,000 rows (no PRD threshold defined; assumption for test data sizing).
5. Background import job mechanism (queue, cron, in-memory) TBD by dev; E2E test RE1.2-E2E-001 requires a stable polling or WebSocket mechanism.

### Dependencies

1. RE-1.3 implementation (admin gate on createContent) — required before any auth tests can pass
2. RE-1.1 implementation (updateContent endpoint + embedding flag) — required before flag assertion tests can pass
3. RE-1.2 implementation (bulk import endpoint + partial-success logic) — required before import tests can pass
4. DB migration for `embeddingStatus` column — required by RE-1.1 test RE1.1-API-002
5. Test user seeds (admin + non-admin) — required by all P0 auth tests

### Risks to Plan

- **Risk**: Embedding flag column name not yet decided → test assertion may use wrong column name
  - **Impact**: RE1.1-API-002 cannot be finalized until schema is confirmed
  - **Contingency**: Use placeholder assertion; update test once schema column is named in migration

- **Risk**: Background import mechanism for RE-1.2 not yet designed (queue vs. in-memory)
  - **Impact**: RE1.2-E2E-001 (background processing test) may need to be simplified or deferred
  - **Contingency**: Demote RE1.2-E2E-001 to P3 if background mechanism is complex to test; rely on manual verification

---

## Interworking & Regression

| Service/Component | Impact | Regression Scope |
|---|---|---|
| **oRPC `contentRouter`** | New `updateContent` and `bulkImport` procedures added; `createContent` moved to `adminProcedure` | Existing FR-1/FR-2/FR-3 API tests (if any) must still pass; RE1.1-API-008 smoke |
| **Drizzle content schema** | New `embeddingStatus` column required for RE-1.1 | DB migration must not break existing content queries (browse, delete) |
| **Recommendation engine (RE-3)** | Score cache and interaction rows must survive content metadata update | RE1.1-API-004 verifies no cascade delete on update |
| **Embedding pipeline (RE-2)** | RE-1.1 sets recomputation flag; RE-2 consumes it | Flag persistence verified in RE-1 tests; consumption verified in RE-2 design |
| **Better-Auth session + admin role** | `adminProcedure` depends on session role field | Existing auth tests should cover role propagation; no new auth infrastructure needed |

---

## Follow-on Workflows (Manual)

- Run `*atdd` on P0 scenarios to generate failing RED-phase API tests for RE-1.3 (createContent auth gate) immediately.
- Run `*atdd` on RE-1.1 P0 scenarios (embedding flag) once `embeddingStatus` schema column is confirmed.
- Run `*automate` for broader coverage after all three stories are implemented.
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
- `nfr-criteria.md` — Security NFR validation patterns

### Related Documents

- PRD: `_bmad-output/planning-artifacts/prds/prd-community-recommendation-engine-2026-06-12/prd.md`
- Epic: `_bmad-output/planning-artifacts/epics-recommendation-engine.md` — Epic RE-1 section
- Architecture: `_bmad-output/planning-artifacts/architecture.md`
- GH Issues: RE-1.1 → #43, RE-1.2 → #44, RE-1.3 → #45

---

**Generated by**: BMad TEA Agent - Test Architect Module
**Workflow**: `bmad-testarch-test-design`
**Version**: 4.0 (BMad v6)
