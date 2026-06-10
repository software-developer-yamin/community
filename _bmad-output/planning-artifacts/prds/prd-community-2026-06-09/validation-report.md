# Validation Report — AceFluency Rebuild PRD

- **PRD:** `_bmad-output/planning-artifacts/prds/prd-community-2026-06-09/prd.md`
- **Rubric:** `.claude/skills/bmad-prd/assets/prd-validation-checklist.md`
- **Run at:** 2026-06-09T01:50:00Z
- **Grade:** Good

## Overall verdict

This is a high-substance, brownfield-aware PRD that earns its place from a real signal source (50+ Play Store complaints) and never strays into furniture. Decision-readiness is strong — every claim is anchored to a review cluster, every FR has testable consequences, and the counter-metrics actually counter the temptation to game the system. The initial review surfaced 2 critical / 5 high findings (refund policy absent as FR, LiveKit Cloud assumption unstated, Skip button dependency, gender-filter empty-pool fallback, support SLA as code-vs-org conflation); all 2 critical and 5 high findings have been folded into the PRD in this pass. The PRD is in **Good** grade: every dimension is strong or adequate, all critical findings resolved. Two phase-blockers (Open Questions 2 and 6) remain and are documented in §0 and §8.

## Dimension verdicts

- Decision-readiness — **strong** (1 medium, 1 low finding)
- Substance over theater — **strong** (no findings)
- Strategic coherence — **strong** (2 low findings)
- Done-ness clarity — **strong** (1 medium, 1 low finding)
- Scope honesty — **strong** (was adequate, upgraded after FR-20 added)
- Downstream usability — **adequate** (2 low findings)
- Shape fit — **strong** (no findings)

## Findings by severity

### Critical (0)
*All 2 critical findings from initial review resolved in this pass.*
- ~~Refund policy absent as FR (§4.5)~~ — **RESOLVED**: added FR-20 (three-path refund mechanism, 7-day human-review SLA, trigger categories).
- ~~LiveKit Cloud assumption unstated (§4.2)~~ — **RESOLVED**: marked Open Question 6 as phase-blocker in §0 and §8.

### High (0)
*All 5 high findings from initial review resolved in this pass.*
- ~~Skip button dependency for FR-11~~ — **RESOLVED**: FR-11 consequence now names Skip as a hard dependency owned by `bmad-ux`.
- ~~Gender-filter 60s empty-pool fallback~~ — **RESOLVED**: FR-8 has a 5-min fallback (keep waiting / drop filter / user picks) and a per-day violation log.
- ~~Support SLA is org-vs-code conflation~~ — **RESOLVED**: FR-16 splits "system measures SLA compliance" (code) from "team meets it" (org dependency).
- ~~+ 2 others resolved in rubric walker review~~

### Medium (3)
- **[medium]** §4.3 FR-8 — 60s wait with no partners available is asserted as "honest" but never validated against user behavior. (rubric)
- **[medium]** §4.5 FR-16 — First-response SLA is testable but depends on staffing, not code. (rubric; partially mitigated by splitting metric from staffing)
- **[medium]** §4.2 Feature-specific NFRs — 200ms jitter is a specific network condition. (adversarial)

### Low (8)
- **[low]** §4.4 FR-11 — "Short" = <30s threshold is opinionated. (rubric)
- **[low]** §4.4 FR-11 — Cooldown durations (1h, 24h) starting values, not justified. (adversarial)
- **[low]** §4.1 FR-1/FR-2 — Implementation details (`expo-secure-store`, refresh rotation) in requirements doc. (adversarial)
- **[low]** §4.6 FR-17 — iOS LiveKit mic-suspension edge case not addressed. (adversarial)
- **[low]** §7 SM-2 — "Currently 2.0–3.5" is sampled, not actual. (rubric)
- **[low]** §6.2 — "Anonymous matching" rationale not surfaced in §1 or Glossary. (rubric)
- **[low]** §4.2 FR-5 / §4.3 — Should reference existing code paths inline. (rubric; partial fix applied)
- **[low]** §5 — No feature-flag protection against B2B creep (SSO/SAML requests). (adversarial)

## Mechanical notes

- **Glossary drift**: "Learner" vs "user" — minor inconsistency (Glossary defines "Learner" but "user" appears in §4.2 FR-7, §6.1). Not load-bearing but worth a polish pass.
- **ID continuity**: FR-1..FR-20 contiguous (20 FRs after FR-20 added). UJ-1..UJ-5 contiguous. SM-1..SM-10 + SM-C1..SM-C4 contiguous. All cross-references resolve.
- **Assumptions Index roundtrip**: 13 inline `[ASSUMPTION]` tags, all 13 indexed in §9. No drift.
- **UJ protagonist naming**: 5 UJs, all with named protagonists (Sumit, Tahiniyath, Vemireddy, Hari, Mridu). All names trace to `docs/ratings-and-reviews.md`.
- **Required sections present**: §0–§9 all present, in order. §5 Non-Goals, §6 MVP Scope split, §7 SMs with counter-metrics, §8 Open Questions (8), §9 Assumptions Index — all complete.

## Phase-blockers (cannot ship without resolution)

1. **Open Question 2 (Refund policy specifics)** — FR-20 structure is set but trigger thresholds and payment-provider integration need a final call.
2. **Open Question 6 (LiveKit Cloud vs. self-hosted)** — FR-6 NFRs and SM-1 are stated under the Cloud assumption.

## Reviewer files
- `review-rubric.md`
- `review-adversarial.md`
