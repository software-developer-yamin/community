# Release Plan — Week 1-6

**Date:** 2026-06-07
**Scope:** AceFluency BD, solo-dev, OSS stack, $0 cloud
**Goal:** ship F1-F8 in 6 weeks, each Friday is a release candidate.

## Priority order (by Theme → by ROI)

| Theme | Spec | Why first | Days |
|---|---|---|---|
| **T1 Onboarding** | F1.1 Reconnect UI | 40% of D1 dropoff is reconnection failure (theme survey) | 1 |
| **T5 Friction** | F5.3 One-tap cancel | quick win, stops ghost-call churn | 0.5 |
| **T3 Habit** | F3.1 30-day session | streaks drive 30d retention | 1 |
| **T2 Discovery** | F2.1 Bad-call button | quality loop → better matches → 7d retention | 1 |
| **T4 Support** | F4.1 In-app help | unblocks users who can't Google | 1 |
| **T8 Quality** | F8.1 Placement + matching | core matching quality | 2 |
| **T8 Quality** | F8.2 Better model stack | upgrade F8.1 with bigger LLM + wav2vec2 + bge | 4 |
| T8 Quality | F8.4 BD-accented fine-tune | BD-specific pron accuracy | 1 (+ 1d training) |
| T2 Discovery | F8.5 Topic-based rooms | give users a practice reason | 3 |
| T8 Quality | F8.3 On-device (optional) | offline BD — defer to week 7+ if bandwidth tight | (deferred) |

## Week-by-week

### Week 1 — Friction & Onboarding (ship 2026-06-13)

| Day | Spec | Deliverable | Risk |
|---|---|---|---|
| Mon | F1.1 Reconnect UI | last-call list, auto-rejoin, 3s respawn | low |
| Tue | F5.3 One-tap cancel | X button on in-call screen, SLB-equivalent confirm | low |
| Wed | F3.1 30-day session | streak counter, daily Nudge, vocab tracker | med — vocab storage schema |
| Thu | F2.1 Bad-call button | 1-5 rating + reason, auto-throttle repeat offenders | low |
| Fri | F4.1 In-app help | 12 FAQ entries (BD-context), search, "ask Yamin" form | low |
| Sat-Sun | buffer / doc / devops | — | — |

**Friday release:** F1.1, F5.3, F3.1, F2.1, F4.1 (5 features, 4.5 dev-days)
**Telemetry gates to release:** D7 retention +5%, support ticket volume -20%

### Week 2 — F8.1 Placement + Matching (ship 2026-06-20)

| Day | Spec | Deliverable | Risk |
|---|---|---|---|
| Mon | F8.1 day 1 | schema, placement router, 5-question quiz | low |
| Tue | F8.1 day 2 | matching algorithm (CEFR ± 1, shared interests, D7 active) | low |
| Wed | F8.1 day 3 | embedding service stub (HuggingFace API free tier) | low |
| Thu | F8.1 day 4 | match explainability ("matched because: same level, like movies") | low |
| Fri | F8.1 day 5 | A/B 50% of new users get placement, 50% legacy skip | low |

**Friday release:** F8.1 (placement test + smart matching)
**Telemetry gates:** match-pair call rating +0.3, D7 retention of placed users ≥ baseline

### Week 3 — F8.2 Better Model Stack (ship 2026-06-27)

| Day | Spec | Deliverable | Risk |
|---|---|---|---|
| Mon | F8.2 day 1 | schema (modelEvalRuns, modelInferenceLog), ORPC router, docker-compose | low |
| Tue | F8.2 day 2 | ONNX services (bge-small embedder, wav2vec2 pron) | med — model download |
| Wed | F8.2 day 3 | eval harness + MOCK datasets (CEFR, pron, match) | low |
| Thu | F8.2 day 4 | shadow-mode kill switch + rollout env (f8.1/f8.2/shadow/ab-10/ab-50) | low |
| Fri | F8.2 day 5 | integration: wire F8.2 router into existing F8.1 endpoints | med — high blast radius |

**Friday release:** F8.2 in **shadow mode** only (F8.1 still primary, F8.2 logs for eval)
**Telemetry gates:** both stacks <1% error rate, F8.2 p95 latency <2s for pron

### Week 4 — F8.2 Rollout + F8.4 (ship 2026-07-04)

| Day | Spec | Deliverable | Risk |
|---|---|---|---|
| Mon | F8.2 day 6 | A/B 10% (sticky hash), monitor cohort metrics | med |
| Tue | F8.2 day 7 | A/B 50% if F8.2 cohort avg rating ≥ F8.1 + 0.2 | med |
| Wed | F8.4 day 1 | training script + augmentation, run on Lambda A100 ($1.20) | low |
| Thu | F8.4 day 2 | ONNX export + INT8 quantization, ship to apps/server/models/wav2vec2-bd | low |
| Fri | F8.4 day 3 | A/B 10% BD users, monitor pron score improvement | low |

**Friday release:** F8.2 at 50% A/B + F8.4 in shadow for BD users
**Telemetry gates:** BD-user "needs improvement" pron rate drops 60% → 50%

### Week 5 — F8.5 Topic Rooms (ship 2026-07-11)

| Day | Spec | Deliverable | Risk |
|---|---|---|---|
| Mon | F8.5 day 1 | topic catalog (5 topics), schema (topicRoom, topicRoomParticipant) | low |
| Tue | F8.5 day 2 | matchPartners extension with topic filter, router (list/join/reportCard/suggest) | med |
| Wed | F8.5 day 3 | web: Practice tab + topic cards + queue UI | med |
| Thu | F8.5 day 4 | native: Practice tab + queue UI + report card | med |
| Fri | F8.5 day 5 | A/B 50% see Practice tab, ship 5 topics, monitor | low |

**Friday release:** F8.5 (topic rooms) at 50% A/B
**Telemetry gates:** topic room completion rate ≥ casual completion rate, wait P95 <60s

### Week 6 — Promote F8.2/4/5 + Stabilize (ship 2026-07-18)

| Day | Deliverable |
|---|---|
| Mon | F8.2 100% rollout (if A/B gates passed), F8.4 100% BD users |
| Tue | F8.5 100% rollout (if completion rate gate passed) |
| Wed | Retrospective: week 1-6 metrics, model swap to F8.2/f8.4, kill F8.1 fallback |
| Thu | Spec F9-F12 backlog prioritization (next quarter) |
| Fri | Public release: 6-week release v2026.07 |

**Friday release:** v2026.07 — all 8 features at 100%
**Telemetry gates:** D7 retention +20% vs pre-F1 baseline, support ticket -30%

## Deferred (post-week 6)

- **F8.3 on-device inference** — bandwidth tight, defer to week 8+
- **F8.6 real-time accent coaching** — separate spec
- **F8.7 cultural BN topics** (Eid greetings etc.) — defer to v2026.08
- **F9+** — wait for week 1-6 retrospective + user feedback

## Dependencies

- F8.2 depends on F8.1 (replaces it)
- F8.4 depends on F8.2 (extends pron model)
- F8.5 depends on F8.2 (reuses matchPartners)
- F1.1, F5.3, F3.1, F2.1, F4.1 are independent of F8.x
- F8.3 is independent but not on critical path

## Cost summary (6 weeks, solo)

| Item | Cost |
|---|---|
| Hetzner CCX13 server (4 weeks) | $20 |
| Lambda A100 training (F8.4, 2hr) | $1.20 |
| Domain + SSL (already have) | $0 |
| Apple Developer (iOS) | $99/yr (existing) |
| Google Play | $25 (one-time) |
| **6-week cash burn** | **~$46** |

## Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| F8.2 model swap breaks existing matches | M | H | shadow mode week 3-4, kill switch wired |
| F8.4 BD fine-tune underperforms on real data | M | M | eval harness + 2-week A/B before promote |
| Topic room wait time >2min for low-pop topics | H | M | auto-redirect to Casual if wait >30s |
| Solo dev burnout (6 weeks is aggressive) | H | H | ship week 1 (quick wins) to build momentum, buffer days Sat-Sun |
| BD user influx on F8.4 promotion | L | H | rate-limit F8.4 promotion via ab-10 → ab-50 → 100% |

## Success metrics (post-week 6)

- D7 retention: +20% vs pre-F1 baseline
- D30 retention: +10% vs pre-F1 baseline
- Support ticket volume: -30% (F4.1 deflects)
- Match-pair call rating: +0.5 stars (F8.1 + F8.2)
- BD-user pron score: 60% "needs improvement" → 30%
- Topic room completion rate: ≥ casual room completion rate
- Infra cost: <$50/mo Hetzner

## Anti-goals (6-week window)

- NO new auth providers (Google only)
- NO biometric / passkey work
- NO Stripe / SSLCommerz integration (monetization deferred to v2026.09)
- NO admin dashboard
- NO push notifications (defer to v2026.08, use email for week 1-6)
- NO i18n beyond EN + BN (UI strings only, no full locale switch)
- NO social feed, NO profile customization
- NO live classes, NO teacher marketplace
