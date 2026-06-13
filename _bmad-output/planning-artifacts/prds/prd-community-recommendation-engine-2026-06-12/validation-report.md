# PRD Validation Report — AceFluency Personalized Content Recommendation Engine

**PRD:** `prd-community-recommendation-engine-2026-06-12`  
**Status:** Final  
**Date:** 2026-06-13  

---

## Overall Grade: Good — 7/7 Strong

| Dimension | Grade | Notes |
|-----------|-------|-------|
| Decision-readiness | Strong | §6 MVP splits cleanly: implemented / gap table / v2 roadmap. Gap table is strongest element |
| Substance over theater | Strong | Functional personas, fully specified scoring algorithm, scoped NFRs, real non-goals |
| Strategic coherence | Strong | Clear thesis: recommendation engine is the "training program" for voice practice. Counter-metrics present |
| Done-ness clarity | Strong | Implemented FRs have testable consequences. Gap FRs appropriately less precise |
| Scope honesty | Strong | Reverse-engineering forces honesty: every feature tagged ✅/⚠️/❌. Gap table ranks by priority + effort + blocker |
| Downstream usability | Strong | Glossary 8 terms, cross-refs resolve, codebase references in §0 |
| Shape fit | Strong | Brownfield companion shape correct: implementation status tags, code-validated architecture, gap FRs inline |

---

## Critical Findings (3)

### [C1] Scoring engine runs on random noise (40% weight)
- **Where:** §4.2 FR-6, §8.3
- **Issue:** Content embeddings are "random 384-dim vectors (placeholder)" from seed endpoint. Hybrid scoring (FR-8) weights cosine similarity at 40% — the largest signal. System makes recommendations where nearly half the scoring weight is mathematically random. PRD marks as "⚠️ Partially implemented" — it is actively producing garbage output.
- **Fix:** Reclassify FR-6 as **hard blocker**. No user-facing feed until real embeddings. Add feature flag to disable feed until resolved.

### [C2] Profile embeddings are also fake — zero personalization
- **Where:** §10, last bullet
- **Issue:** `recomputeEmbedding` in `models.ts` uses hardcoded placeholder values (CEFR: B1, interests: [], goals: [], native: Bangla, age: 25) instead of actual user data. Every user gets the same profile embedding. The 40%-weighted similarity signal is constant on both sides of the computation.
- **Fix:** Add to §6.2 gap table as **High/Blocker**. Profile embedding pipeline must read real user data before embedding-based scoring is meaningful.

### [C3] No mobile surface for 90%+ of users
- **Where:** §4.8, §5
- **Issue:** PRD acknowledges "90%+ of active users are on mobile" (parent PRD §5). Recommendation feed exists only on web. §5 Non-Goals contradicts itself: lists "Native mobile recommendation feed" as non-goal header, then immediately says it's actually MVP-required.
- **Fix:** Remove mobile feed from §5 entirely. It is not a non-goal; it is a blocker. §5 should only cover "admin tools on mobile" as actual non-goal.

---

## High Findings (5)

### [H1] No preferences UI means 30% of scoring is dead weight
- **Where:** §4.5, FR-17
- **Issue:** Tag overlap (20%) and content type preference (10%) require user preferences. No web or mobile UI exists for users to set preferences. API exists but unreachable by real users. Combined with broken embedding (40%), **70% of scoring receives garbage or empty inputs**. Only CEFR closeness (30%) works.
- **Fix:** Elevate FR-17 to blocker. Add preferences onboarding flow to first session (not just settings page).

### [H2] Success metrics cannot validate the thesis
- **Where:** §7
- **Issue:** SM-R1 targets ≥30% engagement rate, but scoring engine is fundamentally broken (random embeddings, fake profiles, empty preferences). Hitting 30% proves users click on lists — not that the algorithm works. No control condition ("vs. random feed" or "vs. CEFR-only feed").
- **Fix:** Add baseline comparison: measure engagement on "newest content at CEFR level" feed vs. hybrid-scored feed.

### [H3] Excluding all interacted content creates depletion spiral
- **Where:** §4.3 FR-9, §10
- **Issue:** Candidate filter excludes *any* interacted content (view, like, bookmark, complete, share, dismiss). With 12 seed items (2 per CEFR level) and ±1 filter, a B1 user has at most 6 candidates. After viewing all 6, feed is permanently empty.
- **Fix:** Exclude only `dismiss` and `complete`. Allow `view`, `like`, `bookmark`, `share` to reappear with decay penalty. Add empty state design with prompt to try different CEFR level or type.

### [H4] `createContent` is `Protected`, not `Admin` — security gap
- **Where:** §8.2
- **Issue:** API table lists `createContent` as "Protected" (authenticated user), not "Admin." Any logged-in learner can create content. PRD describes content creation as admin-only (§4.1). Malicious user could flood library.
- **Fix:** Gate `createContent` behind `adminProcedure`. If UGC planned, make separate moderated endpoint.

### [H5] Public seed endpoint is a wipe-the-database button
- **Where:** §4.7 FR-22, §8.2
- **Issue:** Seed endpoint is `publicProcedure` with `onConflictDoUpdate`. Anyone on internet can overwrite existing content, preferences, interaction data with demo values. PRD flags as "security concern" but classifies as **Medium** priority in §6.2.
- **Fix:** Reclassify to **High/Blocker**. Remove endpoint in production, or gate behind `adminProcedure` + `NODE_ENV !== 'production'`.

---

## Medium Findings (5)

| ID | Where | Issue | Fix |
|----|-------|-------|-----|
| M1 | §4.3 FR-8, §10 | Hybrid score weights (0.4/0.3/0.2/0.1) are arbitrary, no tuning mechanism | Externalize to env vars or config table. Add OQ about tuning methodology |
| M2 | §4.7, §4.8 | FR numbering broken: FR-22 in §4.7 appears after FR-23 in §4.8 | Reorder: §4.7 = Seed, §4.8 = Mobile. Renumber FRs sequentially |
| M3 | §4.4 | No content consumption tracking — only metadata interactions. "view" and "complete" undefined | Define "view" (clicked through to detail page or opened source URL). Define "complete" (explicit button). Add to §3 Glossary |
| M4 | §4.3 FR-10, FR-16 | Score caching stale-on-write: preference update does not invalidate cached scores | Invalidate cached scores when preferences change. Or auto-trigger recalculation after update |
| M5 | §0, §8.4 | Parent PRD dependency unversioned | Add version/hash reference to parent PRD. Add §10 assumption: parent PRD schema remains stable |

---

## Low Findings (5)

| ID | Where | Issue | Fix |
|----|-------|-------|-----|
| L1 | §4.3 FR-9 | Candidate pool cap of 200 is arbitrary, no ordering specified when truncating | Specify ordering (e.g., `createdAt DESC`). Add OQ about whether 200 is right |
| L2 | §4.3, §4.8 | No accessibility or i18n for recommendation feed | Add paragraph or cross-cutting NFR for WCAG 2.1 AA + UI language (EN vs BN) |
| L3 | `.decision-log.md` | Skeletal — only one entry. No record of weight choices, TTL, filter width | Backfill with design decisions from PRD authoring session |
| L4 | §.decision-log.md | Decision log vestigial — no intra-PRD trade-offs logged | Add entries for weight choices, filter width, TTL, or remove log and fold rationale into §0 |
| L5 | §6.2, §6.3 | FR-4 (Update content item) listed in both MVP gaps and v2 roadmap — contradictory | Pick one. If delete-and-recreate workaround acceptable, move to §6.3 only |

---

## Mechanical Notes

- §4.7 and §4.8 are out of order — §4.8 appears before §4.7 in document
- FR-4 appears in both §6.2 and §6.3
- `createContent` listed as "Protected" but §4.1 FR-1 says "[Admin] can create" — verify against code
- FR-8 signal 4 wording: "Binary — 0.1 if the content type matches" — misleading; 0.1 is weight, signal is 1.0/0.0
- Frontmatter says `updated: 2026-06-13` but no changelog explains what changed from 06-12
- No addendum.md — PRD is self-contained, which is fine
- Glossary omits "CEFR" — add definition for downstream consumers
- FR-11: "Skeleton loading states" is implementation pattern, not testable consequence — reframe
- FR-23: lists testable consequences but omits error states (network failure, no CEFR, empty pool)
- FR-4 and FR-5 have no "Consequences (testable)" blocks — only description and priority
- FR-6: "flagged as 'embedding pending'" — no schema field supports this flag. Clarify: does it mean "no row in `content_embedding`" or status column?

---

## Action Summary

| Priority | Count | Actions |
|----------|-------|---------|
| Critical | 3 | Hard-block FR-6 (real embeddings); hard-block profile embeddings (real user data); fix §5 mobile contradiction |
| High | 5 | Elevate FR-17 to blocker (preferences UI); add baseline comparison SM; fix exclusion logic (depletion); gate `createContent` to admin; reclassify seed endpoint to High/Blocker |
| Medium | 5 | Externalize weights; fix section/FR numbering; define view/complete; invalidate cache on preference change; version parent PRD dependency |
| Low | 5 | Cap 200 justification; accessibility/i18n; backfill decision log; resolve FR-4 MVP/v2 contradiction; fix FR-8 signal wording |

---

*Generated by `bmad-prd` validation intent. Rubric + adversarial reviews consolidated.*
