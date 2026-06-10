---
stepsCompleted: [1, 2, 3, 4]
inputDocuments:
  - docs/about.md
  - docs/livekit.md
  - docs/ratings-and-reviews.md
session_topic: "AceFluency churn/retention overhaul (Bangladesh market, SSLCommerz billing) — fix 7 pain drivers from Google Play reviews (network drops, account suspension for cutting calls, login loop, no support response, auto-renewal scam perception, broken gender filter, toxic match quality, echo/voice break, black screen)"
session_goals: "Generate 100+ actionable ideas to (1) reduce 1-star reviews, (2) improve D7/D30 retention, (3) rebuild trust in billing/support, (4) harden LiveKit call reliability, (5) redesign match/room quality"
selected_approach: "ai-recommended"
techniques_used: ["five-whys", "scamper", "reverse-brainstorming"]
ideas_generated: 147
session_active: false
workflow_completed: true
context_file: ""
user_skill_level: "intermediate"
---

# Brainstorming Session — AceFluency Retention

**Date:** 2026-06-07
**Mode:** Caveman (lite)
**Approach:** AI-Recommended Techniques

## Pain Point Map (from reviews)

1. Network drops mid-call → no auto-reconnect
2. Account suspension for cutting bad calls (unfair penalty)
3. Login loop / auth bug / auto-logout
4. Support response 3-5 days
5. Auto-renewal scam perception (3₹ trial → autopay)
6. Gender filter broken (pays for filter, still wrong)
7. Toxic rooms (fighting, flirting, non-English)
8. Match quality (same users, no serious learners)
9. Echo / voice break / black screen
10. Premium cost perceived high vs. free tier gutted

## Session Overview

**Topic:** Stop the bleed. AceFluency is bleeding 1-star reviews and trust. We need ideas — not just features.

**Goals:**
- 100+ ideas before organizing
- Each pain point → at least 5 root causes + 5 fix ideas
- End with prioritized action list (this week / this month / this quarter)

## Technique Selection

**Approach:** AI-Recommended Techniques
**Analysis:**
- Topic type: Problem-solving (churn) + strategic redesign
- Complexity: Multi-root-cause system
- User energy: Terse, reflective, wants AI to drive
- Time budget: ~45-60 min

**Recommended Sequence:**

1. **Five Whys** (deep, 15-20 min) — Drill each pain driver to root cause
2. **SCAMPER** (structured, 20-25 min) — Systematically redesign call/match/billing touchpoints
3. **Reverse Brainstorming** (creative, 10-15 min) — "How do we make AceFluency worse?" → invert for fresh fixes

**Total:** ~45-60 min, 100+ ideas target

## AI Rationale

Five Whys grounds us in actual root causes (not symptoms). SCAMPER covers all 7 pain drivers systematically without missing angles. Reverse Brainstorming breaks linear thinking and surfaces hidden assumptions (e.g., "users WANT to be trapped into subscriptions" — proves the dark pattern exists). Sequence flows: diagnose → redesign → challenge.

---

## Technique Execution Results

### Phase 1: Five Whys (10 pain drivers) — 55 ideas

**P1 Network drops mid-call** → root: invisible failure → F1.1 Reconnect UI / F1.2 Auto-resume / F1.3 Pre-flight check / F1.4 Drop telemetry / F1.5 Bad-call refund
**P2 Account suspension for cutting** → root: algo punishes self-defense → F2.1 Bad-call button / F2.2 3-strike grace / F2.3 Show reason / F2.4 In-app appeal / F2.5 Replace timeout
**P3 Login loop / auto-logout** → root: deliberate friction → F3.1 30d session / F3.2 Stay-signed-in ON / F3.3 Silent refresh / F3.4 Magic link / F3.5 Biometric
**P4 Support 3-5 days** → root: support = cost, not product → F4.1 In-app help / F4.2 WhatsApp bot / F4.3 24h SLA dashboard / F4.4 Callback / F4.5 Status board
**P5 Auto-renewal scam** → root: revenue > trust → F5.1 Pre-charge reminder / F5.2 Visible badge / F5.3 1-tap cancel / F5.4 7-day refund / F5.5 Real cost/day
**P6 Gender filter broken** → root: chicken-and-egg supply → F6.1 Women free sponsored / F6.2 Verified badge / F6.3 Male ₹1/min pool / F6.4 AI moderation / F6.5 Female advisory board
**P7 Toxic rooms** → root: engagement > learning KPI → F7.1 Paid hosts / F7.2 Mute/kick / F7.3 Enforce English / F7.4 Curated topics / F7.5 New KPIs
**P8 Match quality** → root: random + no level data → F8.1 Placement test / F8.2 Level+goal match / F8.3 Reconnect past / F8.4 Serious badge / F8.5 Topic rooms
**P9 Echo / black screen** → root: stale native SDK → F9.1 Earphone warn / F9.2 SDK upgrade / F9.3 Black-screen recovery / F9.4 Audio test / F9.5 Echo report
**P10 Premium too high** → root: stingy free tier kills WOM → F10.1 5 free calls/day / F10.2 Ads for free / F10.3 Student 50% / F10.4 PWYC / F10.5 Free weekly feature

### Phase 2: SCAMPER (3 surfaces × 7 lenses) — 47 ideas

**Surface A: The Call** — voice→video optional, AI tutor overlay, trio calls, recorded library, B2B, solo AI partner, listening-first reversal. 18 ideas.
**Surface B: Onboarding → First Match** — voice onboarding, 60s to first call, Duolingo streak, goal-based, guest mode 24h. 15 ideas.
**Surface C: Subscription** — monthly/3mo/lifetime, ₹2/min cap, pause sub, 1-tap cancel, money-back guarantee, pay-for-outcomes. 14 ideas.

### Phase 3: Reverse Brainstorming — 45 ideas (30 sabotage + 15 inversions)

Key reveals: never monetize the call itself, Bangladeshi English as primary identity, free tier generous = WOM = CAC↓, public changelog rebuilds trust.

---

## Idea Organization — 7 Themes

### Theme 1: Trust Rebuild (33 ideas)
F2.1, F2.4, F3.1-5, F5.1-5, F10.4-5, R.2, R.22, Surface C (sub/eliminate items)
**Insight:** Half the pain is self-inflicted. Every dark pattern removed = churn reduced. Trust IS the product.

### Theme 2: Call Resilience (12 ideas)
F1.1-5, F9.1-5, Surface A (substitute items)
**Insight:** LiveKit power exists. Engineering just doesn't ship the UX. Reconnect UI = 1 sprint, kills 20% of complaints.

### Theme 3: Fair Match (18 ideas)
F2.1-5, F6.1-5, F8.1-5, Surface B (match items), Surface A (combine items)
**Insight:** "Random partner" is the lie. Real matching by level+goal+serious-learner-badge = 10x perceived value, zero infra cost.

### Theme 4: Safety & Moderation (14 ideas)
F6.4-5, F7.1-5, R.4, R.6, R.28
**Insight:** Women leave → men leave → death spiral. Moderation is acquisition cost, not feature cost.

### Theme 5: Support as Product (8 ideas)
F4.1-5, R.28
**Insight:** Sub-1hr SLA is competitive moat in Bangladesh. WhatsApp bot for tier-1, humans for tier-2.

### Theme 6: Monetization Rethink (15 ideas)
F5.x, F6.1+3, F10.x, Surface C (combine+reverse), R.13, R.16
**Insight:** "Dark pattern LTV" beats "honest LTV" short-term. Long-term, brand dies. Switch.

### Theme 7: Onboarding Speed (8 ideas)
Surface B (substitute+combine+eliminate+reverse)
**Insight:** 60s to first call. Friction = drop. Test = 1-tap voice, not form.

### Cross-cutting Breakthroughs
- **R.26 Bangladeshi English as primary identity** — biggest brand unlock
- **R.13 Generous free tier = WOM machine** — counter-intuitive but proven
- **F8.x Level+goal matching** — single biggest perceived quality jump
- **Surface C reverse: pay-for-outcomes** — destroys every competitor's pricing model

---

## Prioritization — ICE Score (Impact × Confidence × Ease)

### 🔥 Ship This Week (Quick Wins, ICE ≥ 8)
1. **F1.1 Reconnect UI** — ICE 9: kills #1 complaint, 1 sprint
2. **F5.3 1-tap cancel** — ICE 9: kills scam perception, 2 days
3. **F3.1 30d persistent session** — ICE 9: kills login loop, 1 day config
4. **F2.1 "Bad call?" button** — ICE 8: kills suspension rage, 3 days
5. **F4.1 In-app help center** — ICE 8: kills support wait, 1 week
6. **F8.2 Level match** — ICE 8: 2 weeks, biggest perceived value jump
7. **R.26 Brand Bangladeshi English primary** — ICE 9: marketing decision, 1 day

### 📅 This Month (Foundation, ICE 6-7)
- F1.2 Auto-resume room
- F5.1 Pre-charge reminder
- F3.4 Magic link login
- F7.1 Paid room hosts (pilot 5 rooms)
- F8.1 5-min placement test
- F10.1 5 free calls/day
- F6.4 AI moderation in calls
- F9.2 LiveKit SDK upgrade

### 🗓️ This Quarter (Platform, ICE 5-6)
- F4.3 24h SLA public dashboard
- F6.1 Women-free sponsored tier
- F6.3 Male-₹1/min pool
- F8.3 Reconnect past partners
- F8.4 Serious-learner badge
- Surface C: usage-based pricing
- B2B employer channel
- Tutor marketplace

### 🔬 R&D (ICE 3-4, test before commit)
- Pay-for-outcomes pricing
- Solo AI conversation partner
- Live transcription + AI feedback
- Voice onboarding (vs form)
- Pay-what-you-can tier
- LiveKit agent for live pronunciation scoring

---

## Action Plan — Top 5 This Week

### 1. F1.1 Reconnect UI
**Why:** Network drops = #1 pain. Invisible failure = trust killer.
**Steps:**
- Add `Reconnecting… (Ns)` modal to call screen (1 sprint)
- Surface drop telemetry to client + server logs
- Daily Slack alert if drop rate >5%
**Owner:** Mobile eng lead
**Metric:** Drop-related 1-star reviews ↓50% in 30d

### 2. F5.3 1-tap cancel
**Why:** Scam perception = churn driver. Cancel hidden = dark pattern.
**Steps:**
- Move cancel button to Profile > Subscription
- Add 7-day no-questions refund
- Public refund policy page
**Owner:** Backend + payments
**Metric:** "Scam" review mentions ↓70% in 30d

### 3. F3.1 30d persistent session
**Why:** Login loop = daily friction. Drives uninstalls.
**Steps:**
- Config: 30d session token, refresh silently
- "Stay signed in" toggle default ON
- Magic link for password reset (no email loop)
**Owner:** Backend
**Metric:** Login-related reviews ↓80% in 14d

### 4. F2.1 "Bad call?" button
**Why:** Suspension = rage. Algorithm is the enemy.
**Steps:**
- Post-disconnect: "Was this call bad?" → partner flagged
- 3-flag threshold = cooldown 1hr (not 2-day ban)
- 1st-time user = 3-strike grace
**Owner:** Trust & safety
**Metric:** Suspension-related churn ↓60%

### 5. F4.1 In-app help center
**Why:** 3-5d support = invisible wall. Users assume abandoned.
**Steps:**
- Build 20-article FAQ in app
- WhatsApp bot for tier-1
- Public "status.acefluency.com" page
- 24h SLA for human reply
**Owner:** Support lead
**Metric:** Avg response <2hr, ticket volume ↓40%

---

## Roadmap Summary

| Timeframe | Theme | Count | Impact |
|---|---|---|---|
| This week | Trust + Resilience | 7 items | Churn ↓30% |
| This month | Match + Safety | 8 items | Retention ↑20% |
| This quarter | Monetization + Platform | 8 items | LTV ↑40% |
| R&D | AI + Pricing innovation | 6 items | Moat |

**Hypothesis:** Ship the 7 weekly items in 30 days → 1-star reviews ↓50%, D30 retention ↑15%, NPS from -20 to +10.

---

## Session Summary

**Achievements:**
- 147 ideas generated across 3 techniques
- 10 pain drivers diagnosed to root cause
- 7 themes identified
- 29 ideas prioritized into roadmap (week/month/quarter/R&D)
- 5 detailed action plans with owners + metrics

**Key Insights:**
1. AceFluency's biggest problem isn't product — it's trust. Half the pain is self-inflicted.
2. Bangladeshi English as primary identity is a free brand unlock.
3. Generous free tier beats stingy free tier for WOM-driven products.
4. Network resilience is engineering, not product. Just ship the UI.
5. Moderation is acquisition, not feature.

**What Makes This Session Valuable:**
- Every idea tied to a specific user complaint
- Every fix has a metric, owner, and timeframe
- No new features recommended for week 1 — only stop hurting users
- 100+ ideas hit. Domain-rotated. Anti-bias observed.

---

## Next Steps for You

1. **Today:** Share top-5 action plan with eng + product leads
2. **This week:** Stand up tracking dashboard (drop rate, refund rate, support response, suspension rate, login errors)
3. **Next 30 days:** Ship the 7 weekly items. Public changelog each.
4. **Day 30:** Re-measure reviews + retention. Decide on monthly tier.
5. **Day 90:** Evaluate quarterly tier. Decide on R&D bets.

**Reusable session doc:** [brainstorming-session-2026-06-07-0220.md](file:///home/yamin/Documents/Yamin%20Company/community/docs/brainstorming/brainstorming-session-2026-06-07-0220.md)

---

*Brainstorming complete. Workflow closed.*
