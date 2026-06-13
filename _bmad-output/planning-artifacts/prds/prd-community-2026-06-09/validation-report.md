# PRD Validation Report — AceFluency Practice-English-with-Peers Rebuild

**PRD:** `prd-community-2026-06-09`  
**Status:** Final  
**Date:** 2026-06-13  
**Consolidated from:** `review-rubric.md` + `review-adversarial.md`

---

## Overall Grade: Good — 6/7 Strong, 1 Adequate

| Dimension | Grade | Notes |
|-----------|-------|-------|
| Decision-readiness | Strong | Phase-blockers resolved inline; honest scope separation for tuning parameters |
| Substance over theater | Strong | No persona/innovation/NFR/vision theater; real reviewer names; self-aware assumptions |
| Strategic coherence | Strong | Clear thesis: stop punishing users for infrastructure failures; every FR maps to a UJ |
| Done-ness clarity | **Adequate** | Most FRs testable; billing/moderation FRs need boundary tightening |
| Scope honesty | Strong | 17 assumptions, real non-goals, inline `[ASSUMPTION]` tags, out-of-scope per FR |
| Downstream usability | Strong | Glossary 19 terms, cross-refs resolve, addendum as overflow not filler |
| Shape fit | Strong | Rebuild shape correct: UJs from complaints, feature groups by failure domain |

---

## Critical Findings (3)

### [C1] Scope unbounded — no timeline, no phasing, everything is MVP
- **Where:** §0, §6
- **Issue:** 20 FRs across 6 feature areas including two greenfield subsystems (billing, moderation). §6 MVP includes *every* FR. No team size, no sprint count, no phase-1 boundary.
- **Fix:** Define hard phase-1 (≤8 weeks, ≤5 FRs: auth + call reliability). State team size and date.

### [C2] India market silently in scope but unscoped
- **Where:** §4.5, OQ-9, Addendum §H
- **Issue:** Live app serves India (INR, Indian tutors). OQ-9 adds second PSP. No FRs for UPI, GST, RBI auto-debit mandate. Refund matrix is "written for SSLCommerz (BDT)" — same matrix hand-waved for India.
- **Fix:** Declare India in/out for MVP. If in: add UPI, e-mandate, GST FRs. If out: remove INR references.

### [C3] Success metrics do not validate user journeys
- **Where:** §7 vs §2.3
- **Issue:** UJ-1 (Sumit banned) → no false-positive strike rate metric. UJ-4 (Hari filter violation) → SM-9 allows 10% paid-filter violation. UJ-5 (Mridu auto-renewal trap) → no "% successfully cancelled auto-renew in-app" metric.
- **Fix:** Add SM for false-positive moderation rate (≤1%), paid-filter violation (0%), cancellation completion rate.

---

## High Findings (8)

### [H1] Skip button is load-bearing but unowned
- **Where:** §4.4 FR-11, Addendum §C
- **Issue:** Skip is called "load-bearing piece" but has no FR, no acceptance criteria, no screen spec. If UX deprioritizes Skip, moderation collapses back to UJ-1 failure mode.
- **Fix:** Promote Skip to full FR: what happens to call, queue re-entry, cooldown between Skips, partner notification.

### [H2] FR-20 auto-deny rule self-contradicts with Addendum §B
- **Where:** §4.5 FR-20 vs Addendum §B
- **Issue:** FR-20 says auto-deny at ">5 completed sessions." Addendum §B says "≥1 completed session." Under addendum, Mridu's refund (1 call, 6 days of crashes) would be auto-denied — the exact UJ-5 failure mode.
- **Fix:** Reconcile: auto-deny only if >5 completed sessions AND refund requested >14 days after charge.

### [H3] No FR for post-call rating flow
- **Where:** §2.3, OQ-7, Addendum §D, §H
- **Issue:** Rating flow exists in live app, OQ-7 says "must preserve," matching quality depends on it, but no FR in §4 or §6. Orphaned dependency.
- **Fix:** Add FR-21: preserve flow, add "Did partner help?" question, feed rating into `matchPartners`, define retention policy.

### [H4] "Rebuild" ignores existing feature surface regression risk
- **Where:** §5, Addendum §H
- **Issue:** Live app has 6 call types, tutor marketplace, AI tests, recorded courses, drama tab, rooms, streaks, friend graph, communities. PRD rewires auth, calls, matching, moderation, adds billing. Existing features depend on all of those. No regression acceptance tests.
- **Fix:** Add §4.7 "Regression Scope" FR listing existing features that must continue working unchanged.

### [H5] SSLCommerz refund API failure has no fallback
- **Where:** §4.5 FR-20
- **Issue:** SSLCommerz outage converts every auto-approve refund to 7-day human-review SLA. No retry policy, no user-visible state.
- **Fix:** 3 retries over 24h before human review. User sees: "Refund approved — processing with payment provider."

### [H6] FR-20 "critical crash" undefined
- **Where:** §4.5 FR-20, Addendum §B
- **Issue:** "≥3 critical app crashes in first 7 days" — "critical" undefined in FR. Addendum says "force-close or black-screen" but lives in addendum, not FR.
- **Fix:** Add parenthetical in FR-20: "critical crash (force-close or ANR reported by OS crash-reporting SDK)."

### [H7] FR-11 "short disconnect" ambiguous
- **Where:** §4.4 FR-11
- **Issue:** "short disconnect = <30s of audio" — does "audio" mean any audio, active speech, or wall-clock? For silent partner, 90s call duration = 0s audio. Determines whether Sumit triggers a strike.
- **Fix:** Define as "call duration <30s wall-clock from both participants joining to one disconnecting."

### [H8] No retention/DAU metric
- **Where:** §7
- **Issue:** SM-2 (store rating) is lagging proxy. No leading indicator of whether rebuild brings churned users back or prevents churn after failure events.
- **Fix:** Add retention-focused SM: D7/D30 retention for users completing ≥3 calls, or "returning user rate after disconnect event."

---

## Medium Findings (12)

| ID | Where | Issue | Fix |
|----|-------|-------|-----|
| M1 | §8, OQ-9 | India PSP has no resolution path or owner timeline | Hard deadline or gate MVP India launch on OQ-9 |
| M2 | §7, OQ-7 | Match quality "PARTIALLY RESOLVED" but weighting deferred to v2 affects SM-6 | Note in SM-6: baseline may shift when OQ-7 weighting lands |
| M3 | §7, SM-2 | Baseline "2.0–3.5 in sampled reviews" is not actual store rating | Pull actual Play Store rating before finalizing SM-2 |
| M4 | §4.1, FR-3 | OTP has no cost model or abuse mitigation | Add rate-limiting (max 5 OTP/hour per phone) |
| M5 | §4.4, FR-11; §4.5, FR-16; §4.5, FR-20 | "Human review" in 3 places with no org definition | Add cross-cutting org dependency: N staff or AI triage required |
| M6 | §7, SM-9 | Gender filter 90% target = 10% paid-feature violation | Redefine: 0% filter violation; separately measure pool health |
| M7 | §4, §6 | No accessibility requirements | Add WCAG 2.1 AA NFR + UI localization (EN, BN, HI) |
| M8 | §4.3, FR-8 | Empty-pool fallback creates dark pattern risk | Add metric: % gender-filtered sessions resolving without fallback prompt |
| M9 | §4.5, FR-17 | State preservation across backgrounding — no distinction between "backgrounded alive" and "OS-killed" | Split consequence: (a) backgrounded-alive persists; (b) OS-killed → "Call ended" state, no strike |
| M10 | §4.1, FR-3 | "Unreachable" for OTP voice fallback undefined | Add: "If SMS not confirmed within 60s, offer voice fallback" |
| M11 | §4.4, FR-12 | Report-voids-strike exploitable (serial false reports) | Add counter-metric: >50% partners reported in 24h → flag for review |
| M12 | §4.3 | "No partners online, waiting 20+ min" buried in §4.3, not in §5/§6.2 | Add to §6.2 Out of Scope for MVP |

---

## Low Findings (11)

| ID | Where | Issue | Fix |
|----|-------|-------|-----|
| L1 | §1 | "4 of 5 adults" claim unverified — softens vision | Soften to "a large majority" or add verification action |
| L2 | §3 | "Skip" used as first-class action but absent from glossary | Add glossary entry |
| L3 | §3 | "Pronunciation Score" in glossary but unused in PRD body | Remove or add to §6.2 as preserved-as-is |
| L4 | §4.1, FR-4 | Google OAuth has no failure-mode consequence | Add: error message + "Try again" + fallback to email/password |
| L5 | §4.5, §4.4 | No data migration plan for existing users | Add FR: existing users get one-time onboarding prompt for new fields |
| L6 | §3 | CEFR placement assumed accurate but never validated | Add v1 metric: % post-call ratings where "partner too advanced/basic" |
| L7 | §4.5, OQ-9 | No error/edge-case handling for dual-PSP billing | Add constraint: currency locked at purchase; no parallel subscriptions |
| L8 | §4 | No dependency graph or build order among 6 feature groups | Add "Build order constraints" to §6.1 |
| L9 | §6.1 | Stale phase-blocker brackets contradict §0 resolution status | Update brackets to match §0 |
| L10 | Addendum §H | Line 168: "FR-3 (gender filter)" — FR-3 is phone auth; FR-8 is gender filter | Fix typo: FR-3 → FR-8 |
| L11 | Addendum §E | Auth NFRs attributed to "FR-1" but auth NFR is under FR-4 | Update §E source column to FR-4 |

---

## Action Summary

| Priority | Count | Actions |
|----------|-------|---------|
| Critical | 3 | Define MVP phase-1 boundary; declare India scope; add journey-validating SMs |
| High | 8 | Promote Skip to FR; reconcile FR-20/Addendum §B; add post-call rating FR; add regression scope; add refund retry; define "critical crash"; define "short disconnect"; add retention SM |
| Medium | 12 | OQ-9 deadline; SM-2 real baseline; OTP rate-limiting; human review org dependency; 0% filter violation; accessibility NFR; empty-pool metric; background/kill split; OTP timeout; report abuse guard; waiting-20min in §6.2 |
| Low | 11 | Soften claim; glossary additions; Google OAuth error; data migration; CEFR validation; dual-PSP constraints; build order; stale brackets; typo fix; NFR source fix |

---

*Generated by `bmad-prd` validation intent. Rubric + adversarial reviews consolidated.*
