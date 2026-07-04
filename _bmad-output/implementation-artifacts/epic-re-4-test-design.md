---
workflowStatus: 'completed'
totalSteps: 5
stepsCompleted: ['step-01-detect-mode', 'step-02-load-context', 'step-03-risk-and-testability', 'step-04-coverage-plan', 'step-05-generate-output']
lastStep: 'step-05-generate-output'
nextStep: ''
lastSaved: '2026-07-05'
epicNum: 're-4'
epicName: 'User Interactions & Feedback Loop'
inputDocuments:
  - _bmad-output/planning-artifacts/epics-recommendation-engine.md
  - _bmad-output/implementation-artifacts/re-4-1-interaction-weighted-scoring-v2.md
  - packages/api/src/routers/recommendations.ts
  - packages/api/src/routers/__tests__/interaction-feedback.test.ts
  - packages/db/src/schema/recommendations.ts
---

# Epic RE-4 Test Design: User Interactions & Feedback Loop

**Epic:** RE-4 — User Interactions & Feedback Loop
**Mode:** Epic-Level
**Date:** 2026-07-05
**Stack:** TypeScript / Hono / Drizzle / PostgreSQL / Bun

---

## 1. Epic Scope

| Story | Title | Status |
|-------|-------|--------|
| RE-4.1 | Interaction-Weighted Scoring (v2) | backlog (implementation in progress — `applyFeedbackLoop` present in `recommendations.ts`, tests exist in `interaction-feedback.test.ts`) |

**Core concern:** Learner interactions (like, dismiss, bookmark, complete) must shift future recommendation scores. Score deltas must be bounded (capped at 1.0), correctly directional (+/−), and gracefully skipped when no history exists.

**Implementation notes (grounded in code):**

- `INTERACTION_WEIGHTS`: `like +0.3`, `bookmark +0.2`, `complete +0.1`, `dismiss -0.2`, `view`/`share` neutral (0).
- `applyFeedbackLoop` aggregates weights per tag across a user's history, sums matching-tag weights per candidate, then clamps the **per-candidate adjustment** to `[adjustmentFloor = -0.2, adjustmentCeiling = 0.5]` before it is added to the base hybrid score.
- The final candidate score is separately clamped to `[0, 1.0]` in `scoreCandidate`.
- Cache invalidation (AC #6) is wired into the `trackInteraction` procedure, which deletes cached `recommendationScore` rows (`scoreType: "hybrid"`) for the acting user after recording an interaction.

---

## 2. Risk Assessment Matrix

| ID | Risk | Category | Probability (1–3) | Impact (1–3) | Score | Mitigation |
|----|------|----------|:-----------------:|:------------:|:-----:|------------|
| R1 | Score exceeds 1.0 after boosting — recommendation quality degrades | DATA | 2 | 3 | **6 ⚠️** | Cap total score at 1.0 |
| R2 | Like and dismiss weights cancel incorrectly | LOGIC | 2 | 3 | **6 ⚠️** | Unit test with competing signals |
| R3 | No interaction history → crash or wrong score | TECH | 1 | 3 | 3 | Guard: skip feedback loop if empty |
| R4 | Cache not invalidated after preference change → stale recommendations | DATA | 2 | 2 | 4 | Invalidate `recommendationScore` on interaction |
| R5 | Feedback loop applied to wrong user (userId mismatch) | SEC | 1 | 3 | 3 | Always filter by userId |
| R6 | Interaction weights become unbounded over many interactions (e.g. dozens of likes on the same tag) | DATA | 1 | 2 | 2 | Per-candidate adjustment clamped to `[adjustmentFloor, adjustmentCeiling]` (`-0.2`..`+0.5`) before it is applied — **implemented** in `applyFeedbackLoop` |

**High risks (≥ 6):** R1, R2 — both require P0 test coverage.

---

## 3. Coverage Matrix

### RE-4.1: Interaction-Weighted Scoring (v2)

| ID | Scenario | Level | Priority | Notes |
|----|----------|-------|----------|-------|
| T-4.1-01 | Like interaction → +0.3 boost applied to same-tag content | Unit | **P0** | Core AC #1 |
| T-4.1-02 | Dismiss interaction → -0.2 penalty applied to same-tag content | Unit | **P0** | Core AC #2 |
| T-4.1-03 | Complete interaction → +0.1 boost, weaker than like | Unit | **P1** | Core AC #3 |
| T-4.1-04 | Bookmark interaction → +0.2 boost, between complete and like | Unit | **P1** | Core AC #4 |
| T-4.1-05a | Like + bookmark on same tag stack to +0.5 | Unit | **P1** | Additive weighting |
| T-4.1-05b | Like + dismiss on same tag cancel to +0.1 (no clamp hit) | Unit | **P0** | R2 — competing signals |
| T-4.1-05c | Stacked boosts clamped at `adjustmentCeiling` (+0.5) | Unit | **P0** | R1/R6 — ceiling clamp |
| T-4.1-05d | Stacked dismissals clamped at `adjustmentFloor` (-0.2) | Unit | **P1** | R1/R6 — floor clamp |
| T-4.1-06 | Liked "travel" + dismissed "politics" → both applied per-candidate independently | Unit | **P0** | Core AC #5 |
| T-4.1-07 | No interaction history → adjustment = 0 for all candidates, no crash | Unit | **P0** | R3 — Core AC #7 |
| T-4.1-08 | `view` and `share` actions produce no adjustment (neutral) | Unit | **P1** | Weight-map correctness |
| T-4.1-09 | Candidate with multiple matching tags sums weights; candidate with no tags → 0 adjustment | Unit | **P1** | Tag-overlap edge cases |
| T-4.1-10 | Interaction with no tags produces no tag-weights (all candidates → 0) | Unit | **P2** | Edge case |
| T-4.1-11 | Custom weight map / custom floor-ceiling override defaults | Unit | **P2** | Config flexibility |
| T-4.1-12 | Final score clamp: base 0.8 + boost 0.3 → 1.0 (not 1.1); base 0.1 − penalty 0.2 → 0 (not −0.1) | Unit | **P0** | R1 — final score clamp in `scoreCandidate` |
| T-4.1-13 | Cache invalidated (`recommendationScore` rows deleted) after `trackInteraction` records a new interaction | Integration | **P1** | R4 — Core AC #6 |

---

## 4. NFR Coverage Plan

| NFR | Planned Validation | Tool/Level | Evidence Artifact |
|-----|--------------------|-----------|--------------------|
| Adjustment bounds `[-0.2, +0.5]` per candidate | T-4.1-05c, T-4.1-05d | Unit | Test pass report |
| Final score bounds `[0, 1.0]` | T-4.1-12 | Unit | Test pass report |
| No crash / correct no-op with no interaction history | T-4.1-07 | Unit | Test pass report |
| Correct weight magnitudes and directionality | T-4.1-01 – T-4.1-04, T-4.1-08 | Unit | Test pass report |
| Cache freshness after interaction recorded | T-4.1-13 | Integration | Test pass report |

---

## 5. Execution Strategy

- **PR gate:** T-4.1-01, T-4.1-02, T-4.1-05b, T-4.1-05c, T-4.1-06, T-4.1-07, T-4.1-12 (all P0 unit tests — target <30s, no DB required, pure function tests)
- **Nightly:** T-4.1-13 (integration: requires DB — `trackInteraction` → cache invalidation → recompute)
- **On-demand / manual:** end-to-end verification against a seeded interaction history in the native/web recommendation feed

---

## 6. Resource Estimates

| Priority | Estimate |
|----------|----------|
| P0 (7 tests) | ~6–9 hours |
| P1 (6 tests) | ~6–9 hours |
| P2 (3 tests) | ~2–4 hours |
| **Total** | **~14–22 hours** |

*Note: estimate reflects remaining review/hardening effort — `applyFeedbackLoop` and its unit test suite (`interaction-feedback.test.ts`) already exist in the working tree; sprint-status still lists `re-4.1` as backlog pending PR/review.*

---

## 7. Quality Gates

- P0 tests: 100% pass before `re-4.1` PR merges
- P1 tests: ≥ 95% pass before epic-re-4 closure
- No silent overflow: every code path that sums interaction weights must go through the `[adjustmentFloor, adjustmentCeiling]` clamp before being added to the base score (R1/R6 gate)
- No silent cancellation bug: like+dismiss on the same tag must net to the arithmetic sum, not short-circuit to either extreme (R2 gate)
- `trackInteraction` must always scope deletes/reads by `userId` (R5 gate — no cross-user leakage)
- Coverage target: ≥ 90% of `applyFeedbackLoop` and `scoreCandidate` branches (feedback-loop logic is pure and cheap to fully cover)

---

## 8. Key Risks Summary

1. **R1 + R2 (HIGH):** Score-cap violations and incorrect like/dismiss cancellation. Mitigated by the two-stage clamp (`applyFeedbackLoop`'s per-candidate `[-0.2, +0.5]` clamp, then `scoreCandidate`'s final `[0, 1.0]` clamp) — both stages need explicit P0 coverage (T-4.1-05c/d, T-4.1-12).
2. **R3 (MEDIUM):** Empty interaction history must short-circuit to a zero adjustment map without touching the DB unnecessarily or throwing — covered by T-4.1-07.
3. **R4 (MEDIUM):** Recommendation cache must be invalidated on every new interaction, not just on preference changes — covered by T-4.1-13; requires integration-level DB test since it spans two procedures (`trackInteraction` → `getRecommendations`).
4. **R5 (LOW but SEC-flavored):** Feedback loop must never read another user's interaction history — verify `userId` filters are present on every query path touched by this story.
