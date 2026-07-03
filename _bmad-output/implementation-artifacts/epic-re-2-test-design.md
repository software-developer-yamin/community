---
workflowStatus: 'completed'
totalSteps: 5
stepsCompleted: ['step-01-detect-mode', 'step-02-load-context', 'step-03-risk-and-testability', 'step-04-coverage-plan', 'step-05-generate-output']
lastStep: 'step-05-generate-output'
nextStep: ''
lastSaved: '2026-07-03'
epicNum: 're-2'
epicName: 'Embedding Engine'
inputDocuments:
  - _bmad-output/planning-artifacts/epics-recommendation-engine.md
  - packages/db/src/schema/recommendations.ts
  - packages/api/src/routers/models.ts
  - packages/api/src/routers/recommendations.ts
  - packages/api/src/routers/__tests__/bulk-import.test.ts
---

# Epic RE-2 Test Design: Embedding Engine

**Epic:** RE-2 — Embedding Engine  
**Mode:** Epic-Level  
**Date:** 2026-07-03  
**Stack:** TypeScript / Hono / Drizzle / PostgreSQL (pgvector implied) / Bun

---

## 1. Epic Scope

| Story | Title | Status |
|-------|-------|--------|
| RE-2.1 | Compute Content Embedding on Creation | backlog |
| RE-2.2 | Recompute Content Embedding on Update | backlog |
| RE-2.3 | Real Profile Embeddings from User Data | backlog |

**Core concern:** Ensure real 384-dimensional BGE-small-en-v1.5-int8 embeddings are stored, kept fresh, and feed correctly into the hybrid scoring pipeline. The embedding service is a remote HTTP dependency at `EMBED_URL` — its availability is a risk.

---

## 2. Risk Assessment Matrix

| ID | Risk | Category | Probability (1–3) | Impact (1–3) | Score | Mitigation |
|----|------|----------|:-----------------:|:------------:|:-----:|------------|
| R1 | Embedding service unavailable at creation time; item stored with null embedding | TECH | 2 | 3 | **6 ⚠️** | Graceful fallback: create item, flag embedding_pending, retry later |
| R2 | 384-dim constraint violated (embedding service version drift) | DATA | 1 | 3 | 3 | Zod schema validates length=384 before insert |
| R3 | Silent embed failure — exception swallowed, item not flagged | TECH | 2 | 3 | **6 ⚠️** | catch block must flag item, not silently ignore |
| R4 | Update without re-embed — stale vector persists after title/description change | DATA | 2 | 2 | 4 | RE-2.2 must trigger recompute on relevant field changes |
| R5 | Profile embedding computed with wrong field set (missing tags, cefrLevel) | DATA | 1 | 3 | 3 | RE-2.3 text construction mirrors RE-2.1 schema |
| R6 | Cosine similarity not computed correctly (wrong dimension ordering) | BUS | 1 | 3 | 3 | Unit test with known vectors |
| R7 | Feed exposed before real embeddings confirmed (feature flag gap) | BUS | 2 | 2 | 4 | Feature flag logic guards feed until embeddings ready |
| R8 | Background retry storm if service is down for extended period | PERF | 1 | 2 | 2 | Exponential backoff / rate limiting on retry |

**High risks (≥ 6):** R1, R3 — both require P0 test coverage.

---

## 3. Coverage Matrix

### RE-2.1: Compute Content Embedding on Creation

| ID | Scenario | Level | Priority | Notes |
|----|----------|-------|----------|-------|
| T-2.1-01 | Happy path: create content → embed service returns 384-dim vector → stored in content_embedding | API Unit | **P0** | Mock embed service with valid response |
| T-2.1-02 | Embed service returns 500 → item still created → flagged embedding_pending | API Unit | **P0** | Critical R1/R3 mitigation |
| T-2.1-03 | Embed service timeout → item still created → flagged embedding_pending | API Unit | **P0** | Critical R1/R3 mitigation |
| T-2.1-04 | Embed returns wrong dimension (e.g., 256-dim) → rejected by Zod → embedding_pending | API Unit | **P1** | Zod schema enforcement |
| T-2.1-05 | Background retry: embedding_pending items → service available → embedding computed | API Unit | **P1** | Retry job execution |
| T-2.1-06 | Feature flag off → feed endpoint returns 403/empty | API Unit | **P1** | Flag guards user-facing feed |
| T-2.1-07 | modelVersion stored as "bge-small-en-v1.5-int8@1:f8.2" exactly | API Unit | **P1** | Version string correctness |
| T-2.1-08 | Content with no tags → text = "title description " (no trailing comma) | API Unit | **P2** | Edge case: null/empty tags |

### RE-2.2: Recompute Content Embedding on Update

| ID | Scenario | Level | Priority | Notes |
|----|----------|-------|----------|-------|
| T-2.2-01 | Update title → embedding recomputed with new text | API Unit | **P0** | Core AC |
| T-2.2-02 | Update description → embedding recomputed | API Unit | **P0** | Core AC |
| T-2.2-03 | Update thumbnail_url only → embedding NOT recomputed | API Unit | **P1** | Non-semantic field guard |
| T-2.2-04 | Update source_url only → embedding NOT recomputed | API Unit | **P1** | Non-semantic field guard |
| T-2.2-05 | Embed service down during update → old embedding retained → flagged pending | API Unit | **P1** | Resilience on update path |
| T-2.2-06 | Recomputed embedding replaces old one (upsert semantics) | API Unit | **P1** | No duplicate rows |

### RE-2.3: Real Profile Embeddings from User Data

| ID | Scenario | Level | Priority | Notes |
|----|----------|-------|----------|-------|
| T-2.3-01 | Profile text constructed from cefrLevel + nativeLanguage + tags | API Unit | **P0** | Text construction matches schema |
| T-2.3-02 | Cosine similarity between two known vectors returns expected score | Unit | **P0** | Math correctness |
| T-2.3-03 | Profile embedding stored/updated on user preference change | API Unit | **P1** | Trigger on preference update |
| T-2.3-04 | Profile embedding used in hybrid score calculation (not zero vector) | API Integration | **P1** | End-to-end: preference → embed → score |
| T-2.3-05 | User with no preferences → fallback scoring (no crash) | API Unit | **P2** | Null-safe fallback |

---

## 4. NFR Coverage Plan

| NFR | Planned Validation | Tool/Level | Evidence Artifact |
|-----|-------------------|------------|------------------|
| Resilience: embed service failure must not block writes | T-2.1-02, T-2.1-03 | API Unit (fetch mock) | Test pass report |
| Correctness: 384-dim constraint enforced | T-2.1-04 (Zod) | API Unit | Test pass report |
| Performance: embedding call must not add >500ms to P95 create latency | Manual / k6 load test | Nightly | k6 report |
| Data integrity: no duplicate content_embedding rows | T-2.2-06 (upsert) | API Unit | Test pass report |

---

## 5. Execution Strategy

- **PR gate:** T-2.1-01 through T-2.1-04, T-2.2-01 through T-2.2-04, T-2.3-01, T-2.3-02 (all P0+P1 unit tests, target <60s)
- **Nightly:** T-2.3-04 (integration: requires running embed service), k6 latency benchmark
- **Manual:** Feature flag end-to-end with real embed service

---

## 6. Resource Estimates

| Priority | Estimate |
|----------|----------|
| P0 (5 tests) | ~8–12 hours |
| P1 (9 tests) | ~12–18 hours |
| P2 (3 tests) | ~3–5 hours |
| **Total** | **~23–35 hours** |

---

## 7. Quality Gates

- P0 tests: 100% pass before any story PR merges
- P1 tests: ≥ 95% pass before epic closure
- No silent swallow of embed errors (R3 gate: catch block must flag, never empty catch)
- Coverage target: ≥ 80% of embedding-related code paths
- NFR evidence: k6 latency report exists before epic-re-2 retrospective

---

## 8. Key Risks Summary

1. **R1 + R3 (HIGH):** Silent failure / non-flagging when embed service is down. Every `catch` block in embedding paths must actively flag `embedding_pending`, never silently swallow.
2. **R4 (MEDIUM):** Stale embeddings after update. RE-2.2 implementation must check which fields changed before triggering re-embed.
3. **R7 (MEDIUM):** Feature flag discipline required — feed must remain gated until embedding coverage is confirmed.
