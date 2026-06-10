# Addendum — AceFluency Rebuild PRD

*Overflow from `prd.md`. Material that does not belong in the main spec but earns its place somewhere: rejected alternatives, options-considered matrices, mechanism/transport decisions, technical how-to, sizing data, and any user-contributed depth.*

---

## A. LiveKit Reconnection Strategy (detail backing §4.2 FR-6)

**Status (2026-06-09):** LiveKit Cloud confirmed (OQ 6 resolved). SLOs in FR-6 and SM-1 / SM-8 are now stated under confirmed Cloud topology.

The LiveKit SDK supports two recovery paths: ICE restart (fast, ~500ms, same Room) and full reconnection (slow, ~5s, same Room, re-publishes tracks). The PRD's 30s reconnect window is bounded to ICE restart for blips under ~10s, then to a "connection lost" prompt at 30s.

**Rejected alternative: auto-rejoin a new Room on disconnect.**
- Pro: Simpler client code; no UX state to manage.
- Con: Loses the conversation, breaks the user's flow, and — for the partner — is indistinguishable from the user "just leaving." This is exactly the failure mode UJ-3 describes.
- Decision: do not auto-rejoin. Rejoin is a deliberate user action.

**Rejected alternative: silent reconnect with no UI indicator.**
- Pro: No UX surface to build.
- Con: A user with a true connection loss thinks they're talking to a dead partner. Trust-erosion.
- Decision: a 5s blip *does* show a "reconnecting…" indicator to the affected user. The partner sees nothing (per FR-6 consequence).

**Network assumption for SLOs:** 4G on Bangladeshi cellular, 100–400ms jitter, 5–15% packet loss on bad days. The 95% reconnect-on-1s-blip target is now confirmed under LiveKit Cloud (OQ 6 resolved 2026-06-09). Cloud's global mesh SFU keeps a BD user connected to the nearest edge node even when roaming across the BD/IN border, which a self-hosted single-server-per-room topology could not have matched.

---

## B. Refund Trigger Threshold Matrix (detail backing §4.5 FR-20)

The three-path structure in FR-20 needs concrete thresholds to ship. Below are the starting values; tune from data after the first 1000 refund requests.

| Trigger | Auto-approve window | Auto-approve amount | Window |
|---|---|---|---|
| ≥3 critical app crashes (force-close or black-screen) | Yes | Full charge | First 7 days post-charge |
| Never connected to a completed call | Yes | Full charge | First 14 days post-charge |
| Reported login failure lasting >72h, with a ticket ID open | Yes | Full charge | First 14 days post-charge |
| ≥1 completed session | No (auto-deny) | — | — |
| Refund requested >14 days after charge | No (auto-deny with reason) | — | — |
| Edge case (e.g., 1–2 crashes, 1–2 sessions, >14 days) | Human review (7-day SLA) | — | — |

**Refund denial explanation template:** "We can't issue a refund because [reason]. If you think this is wrong, reply to this thread — a human will look at it within 7 days."

**Per-payment-provider API mapping:** out of scope here; Open Question 1.

---

## C. Strike Tuning Reference (detail backing §4.4 FR-11)

The graduated-strike numbers (3, 5, 10 in 24h) are starting values. They are not tuned to data — the v1 rebuild ships with these and v2 tunes from observation. Below is the rationale for the *direction* of the numbers:

- **3 disconnects = warn**: low enough that a user with a bad session (partner went silent, audio garbage) gets a soft signal; high enough that a normal user with mixed-quality matches never sees a warning.
- **5 disconnects = 1h cooldown**: this is the user who is *consistently* rejecting the system. A 1h cooldown is short enough to not be punitive (current 48h ban) but long enough to interrupt a behavior pattern.
- **10 disconnects = 24h cooldown + human review**: the hard threshold. By 10 short disconnects in 24h, the user is either abusive or the system is matching them catastrophically. Either way, a human needs to look.

**The Skip button is the load-bearing piece.** Without it, the only way a user can reject a bad match is to hang up, and hanging up counts as a strike. With Skip, the user has a strike-free rejection path. *See FR-11 dependency note in `prd.md`.*

---

## D. Match Quality Inputs (detail backing Open Question 7)

The PRD keeps matching as embedding-similarity + CEFR ±1 (already in `packages/api/src/routers/models.ts`). The "match quality" question is *not solved* by this rebuild. Open Question 7 lists it as a v2 item.

**Inputs that would let v2 measure match quality** (deferred):

- Post-call rating (1–5 stars from each participant, post-call modal).
- "Would you want to talk to this partner again?" yes/no prompt.
- Pre-call level re-prompt ("still A2?" yes/no) — to keep CEFR accurate over time.
- Disconnect-within-30s rate per (user, time-of-day) bucket — proxy for bad-match rate.
- Conversation-duration distribution per match — proxy for engaged vs. silent partners.

---

## E. Cross-cutting NFRs (lifted from per-feature NFRs for the architecture workflow)

| Domain | NFR | Source FR |
|---|---|---|
| Latency | Audio round-trip p95 ≤ 400ms, p99 ≤ 700ms (Cloud assumption) | FR-6 |
| Latency | Cold-start-to-home p95 ≤ 2.5s on Pixel 4a | FR-1 |
| Reliability | Reconnect (1s blip) ≥ 95% success | FR-6 |
| Reliability | Reconnect (5s blip) ≥ 80% success | FR-6 |
| Auth | Login first-attempt success ≥ 99% (valid credentials) | FR-1 |
| Auth | Login 3-attempt success ≥ 95% (valid credentials) | FR-1 |
| Match | Unfiltered queue wait p95 ≤ 45s | FR-10 |
| Match | Gender-filtered queue wait p95 ≤ 90s | FR-10 |
| Match | Premium filter fulfillment ≥ 90% | FR-8 |
| Moderation | Disconnect-during-call ≤ 5% (network / unexplained) | FR-6, FR-7 |
| Support | First-response p95 ≤ 24h paying, ≤ 72h free | FR-16 |
| Billing | Paid-state-change propagation to app ≤ 60s | FR-14, FR-15, FR-20 |
| Refund | Human-review decision ≤ 7 days | FR-20 |

**Observability requirement:** Every NFR above must be measurable in production. Architecture must define the metric, the source (logs, traces, app events), and the dashboard. No NFR is shipped without a measurement path.

---

## F. Existing-Code Anchors (for `bmad-create-architecture` hand-off)

| PRD construct | Existing file | Action |
|---|---|---|
| §4.1 auth (email/password) | `packages/auth/src/index.ts` | Keep. Extend with phone OTP + Google. |
| §4.1 auth (Expo mobile) | `apps/native/lib/auth-client.ts` | Keep. Add secure-storage-backed refresh. |
| §4.1 user schema | `packages/db/src/schema/auth.ts` | Add `gender`, `nativeLanguage` fields. |
| §4.2 LiveKit token | `packages/api/src/routers/livekit.ts` | Keep `livekit.token`. Add `livekit.createRoom`, `livekit.closeRoom`. |
| §4.3 match | `packages/api/src/routers/models.ts` (`matchPartners`) | Extend with gender predicate + empty-pool fallback. |
| §4.3 profile template | `packages/api/src/routers/models.ts` (`recomputeEmbedding`) | Replace hardcoded `"Bangla"` with user-configurable field. |
| §4.3 CEFR placement | `packages/db/src/schema/models.ts` (`cefrPlacement`) | Keep. |
| §4.4 strike system | — (does not exist) | New: `packages/db/src/schema/moderation.ts` + `packages/api/src/routers/moderation.ts`. |
| §4.5 subscription | — (does not exist) | New: `packages/db/src/schema/billing.ts` + `packages/api/src/routers/billing.ts`. |
| §4.5 refund | — (does not exist) | New: extend billing router with `refund.request`, `refund.decide`. |
| §4.6 mobile stability | `apps/native/` (general) | Audit app-state handling, backgrounding behavior on iOS + Android. |

---

## G. Open Questions deferred to downstream workflows

| OQ | Workflow that resolves it |
|---|---|
| 1 (payment provider) | **RESOLVED (2026-06-09)**: **SSLCommerz.** Architecture owns sandbox/live creds + webhook signature verification. |
| 2 (refund thresholds — partially resolved by FR-20) | PM + Legal at Finalize. Refund execution via SSLCommerz Refund API. |
| 3 (gender field inclusivity) | `bmad-ux` |
| 4 (push notifications scope) | PM (v2) |
| 5 (AI agent integration) | PM + `bmad-create-architecture` (v2) |
| 6 (LiveKit Cloud vs. self-host) | **RESOLVED (2026-06-09)**: **LiveKit Cloud.** Engineering owns sandbox creds + production project setup. |
| 7 (match quality measurement) | `bmad-ux` (v2) |
| 8 (SMS provider for BD/IN) | `bmad-create-architecture`. Likely trivially resolved via SSLCommerz-affiliated SMS partner. |

## H. Existing App Surface Map (from screenshot review, 2026-06-09)

20 of 78 screenshots reviewed. New inputs to PRD that were not in the Play Store reviews:

### Top-level navigation (5 tabs)
- **Home** — Group Discussions (LIVE), 1:1 Classes, Group classes, Trainer talk, Talk with Advanced learners, Recorded Courses (Video/Audio), Summer Offer ("3 Day Trial at 88% OFF — Pay ₹3"), Daily Speaking Streak widget.
- **Classes** — Personal Coaching 1-on-1 (₹99 trial), Expert trainer Flexible timing, Book trial class with tutor profile + rating, Book now, Upcoming classes, Schedule a trainer.
- **Drama** — scripted content tab.
- **Rooms** — Rooms by Category (English / Bilingual / Content Creator), Upcoming Rooms (Trainer + Other Rooms), Other Live Rooms (All Rooms filter), room cards with Follower count.
- **My View** — Daily Speaking Streak (10 min Calling + 2 min Room goal → +10 stars), My Network (Friends, Call History), My Calling Queue with "Add Calling Queues" dropdown, My Communities.

### Call types currently in the app
- **Co-learner 1:1 call** (the "Main Calling Queue" — confirms the rebuild's match pool).
- **1:1 Class** with a paid expert trainer (tutor marketplace; prices ₹99–₹2500; ratings 4.0–4.9; native language tags: Marathi, Hindi, Tamil, Telugu, Bengali).
- **Group class** with multiple students + a trainer.
- **Trainer talk** — browse trainers by language + rating.
- **AI speaking test** — 32 topic cards, AI Trainer persona, 60s per topic.
- **Voice Club / Live room** — group discussion.

### Existing engagement mechanisms
- **Daily Speaking Streak** — 10 min of Calling + 2 min of Room = +10 stars. **Already a feature.** The rebuild should not duplicate; preserve and tune.
- **Post-call rating** — "Rate your last caller" (1–5 stars + optional comment + Skip). **Already a feature.** OQ 7 is now partially resolved.
- **Friendliness Rating** — shown on user profiles (e.g., "Friendliness Rating - 4.1/5"). Already exists.
- **My Friends** tab in My Network — friend graph already exists.

### Existing gates and paywalls
- **Soft paywall on Room Creation** — "Access to create a live room is a premium feature." Listening is free.
- **Hard paywall on 1:1 Trainer Talk** — must be paid + use minutes (currency BDT/INR).
- **Hard paywall on AI Speaking Test history** — "Please upgrade to a paid plan to view your speaking test history."
- **Persistent "Get Pro" CTA** — visible to all users, including logged-in paying users. Implies no "you're already Pro" badge.

### Existing onboarding/legal surface
- **Community Guidelines modal** — "Avoid Short Calls, No misbehaviour, Avoid bullying, No inappropriate talk. Remarks and ratings are monitored; guideline violations result in account suspension." Shown as a required I-agree gate. **Confirms a moderation system already exists at the policy level; FR-13 (visible moderation state) should integrate with it rather than replace.**

### Network conditions on user devices
- Speed indicators in screenshots: 19, 21, 24, 40, 42, 50, 128 KB/s. **Confirms UJ-3 — the primary market is on poor cellular.** PRD's network assumptions are correct.

### Two-market confirmation
- BDT pricing (800/1600/2500) on subscription screen — Bangladesh.
- INR pricing (₹99 trial, ₹206 one-screen, $38 trial) — India. The app uses currency detection by locale.
- Tutors list native language: Marathi, Hindi, Tamil, Telugu, Bengali — confirms IN multi-language market.

### PRD cross-references
- **FR-3 (gender filter)**: confirmed as a Calling Queue preference. The rebuild's job is to *honor* the filter, not build it.
- **FR-8 (gender filter)**: ditto. The UI exists. The rebuild makes the contract honest.
- **FR-9 (native language)**: confirmed needed (tutors are tagged by language; co-learner calls presumably need the same).
- **FR-11 (graduated strikes)**: confirmed the policy exists. The rebuild must change the *enforcement*, not the policy.
- **FR-13 (visible moderation state)**: confirmed the policy exists. UI surface is partial (I-agree modal exists; ongoing state does not).
- **FR-14 (visible subscription state)**: confirmed broken — no "renews on" or "auto-renew on/off" anywhere.
- **OQ 7 (match quality measurement)**: partially resolved — see top of this section.
- **OQ 9 (India PSP)**: new.
- **Non-Goals** (v1): the screenshot evidence confirms Room Creation (Voice Clubs), AI Speaking Test, Recorded Courses, and the Tutor Marketplace all exist. The rebuild does *not* redesign them.

### Multi-PSP implication for FR-20 (refund)
The refund matrix in §B is written for SSLCommerz (BDT). For India (INR), the same matrix applies but execution uses the India PSP's refund API. The FR-20 three-path structure is provider-agnostic; only the implementation is dual.
