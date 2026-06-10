---
title: AceFluency — Practice-English-with-Peers Rebuild
created: 2026-06-09
updated: 2026-06-09
status: final
---

# PRD: AceFluency — Practice-English-with-Peers Rebuild

## 0. Document Purpose

This PRD is for the PM, engineering lead, design lead, and downstream workflow owners (`bmad-ux`, `bmad-create-architecture`, `bmad-create-epics-and-stories`) rebuilding AceFluency's mobile + web product around real user pain surfaced in 50+ Play Store reviews through May 2026. It is built from two source materials: the public Play Store complaint set (`docs/ratings-and-reviews.md`) and the existing codebase inventory (Next.js, Expo, Hono, oRPC, Drizzle, PostgreSQL, Better-Auth, LiveKit already wired at the token-mint layer).

Structure: §1 Vision, §2 Target User (with named-protagonist user journeys UJ-1..UJ-5 reflecting the dominant review personas), §3 Glossary, §4 Features grouped with globally numbered FRs, §5 Non-Goals, §6 MVP Scope, §7 Success Metrics with counter-metrics, §8 Open Questions, §9 Assumptions Index. Inline `[ASSUMPTION: ...]` tags mark inferred requirements. The `addendum.md` will hold the matched-architecture design, LiveKit reconnection strategy detail, and refund-policy options matrix that do not belong in the main spec.

**Phase-blockers** (must be resolved at Finalize before the PRD ships):
- ~~Open Question 6 (LiveKit Cloud vs. self-hosted) — blocks §4.2 NFR sign-off because FR-6 reconnect SLOs and SM-1 are stated under the Cloud assumption.~~ **RESOLVED (2026-06-09):** **LiveKit Cloud.** SLOs and SMs in §4.2 now stated under confirmed Cloud topology.
- Open Question 2 (refund policy specifics) — *demoted from phase-blocker to open question (2026-06-09):* FR-20 *structure* (three-path refund mechanism) is the requirement; the *thresholds* (3 crashes / 7 days / etc.) are tuning owned by PM + Legal and do not block the PRD itself. The PRD ships as `final` with this open.

**Inputs already in scope** (do not duplicate):
- `docs/about.md` — product marketing copy (read for tone)
- `docs/ratings-and-reviews.md` — primary pain-signal source
- `docs/livekit.md` — LiveKit SDK reference (background)
- Existing schema at `packages/db/src/schema/{auth,models}.ts`
- Existing matching router at `packages/api/src/routers/models.ts` (`matchPartners`)
- Existing LiveKit token router at `packages/api/src/routers/livekit.ts` (`livekit.token`)

---

## 1. Vision

AceFluency is a peer-to-peer English-speaking practice app for South Asian learners, with a primary audience in Bangladesh where 4 of 5 adults report spoken-English fluency anxiety (`about.md`). The product pairs learners for short, structured voice conversations, surfaces the right partner by level and intent, and gets out of the way of the actual practice. It is *not* a lesson app, *not* a teacher marketplace, *not* a content feed — it is the gym for spoken English: a place to show up, talk to a real person, and leave measurably better than you arrived.

This rebuild exists because the current build has earned sustained 1- and 2-star reviews (12+ of 50+ sampled) over a single, repeating failure pattern: **the technology fails the user at the moment the user is most motivated.** Calls drop on network hiccups. Auth loops users back to login. A disconnect counter punishes users for leaving a bad call. The gender filter is purchased but not enforced. The subscription auto-renews and there is no in-app escape. The rebuild's reason for being is to make every one of those failure moments *not happen*, and to make the moments that still do happen visibly handled — not silent, not punishing, not a three-day wait for an email reply.

The differentiation is unflattering but real: the category is full of apps that promise "AI tutors" and "fluency in 30 days" and lose to one that *just keeps the call connected and lets two people finish a sentence.*

## 2. Target User

### 2.1 Jobs To Be Done

- **Functional:** Practice spoken English with a real person for 10–25 minutes per session, ideally daily, without the friction of scheduling or paying per minute.
- **Emotional:** Reduce the anxiety of speaking English to a stranger. Build confidence through repetition, not through passive consumption of lessons.
- **Social:** Meet other learners at a similar level; feel part of a community of people working on the same thing.
- **Contextual:** Use the app on a low-end Android device on a Bangladeshi mobile data network, often while commuting, often with intermittent connectivity.

### 2.2 Non-Users (v1)

- Learners seeking **1:1 professional tutoring from native speakers** (HelloTalk Pro, italki). AceFluency is peer-to-peer, not a teacher market.
- Learners seeking **structured curriculum** (Duolingo, Babbel). AceFluency assumes the user already has a baseline and wants reps, not lessons.
- **Corporate / B2B English training** buyers. Out of scope for this rebuild.
- **Native English speakers** looking to learn Bangla/Hindi. Out of scope; matching is uni-directional toward English practice.

### 2.3 Key User Journeys

The dominant review-cluster personas are real names lifted from `ratings-and-reviews.md`. Each UJ is anchored to a cluster of complaints the rebuild must close.

- **UJ-1. Sumit, the premium user who got punished for leaving a bad call.**
  - **Persona + context:** Sumit (Bengali, M, paid annual, intermediate) opened the app to practice 20 minutes before bed. He was matched with a partner who would not speak and just held the phone open. He ended the call after 90 seconds. Then again. Then a third time.
  - **Entry state:** Authenticated, in the matchmaking queue, premium tier, network stable.
  - **Path:** (1) End three calls inside 60s → current system applies a "strike" → 48-hour calling ban. (2) Sumit opens the app 6 hours later, sees the lockout, files a refund complaint via email. (3) No response for 5 days. (4) Sumit leaves a 1-star review and uninstalls.
  - **Climax:** Sumit pays for premium and gets *locked out* of the product for the act the product is designed for (practicing).
  - **Resolution:** The product has spent a paying user's trust and gained a Play Store complaint.
  - **Edge case:** Sumit reports the partner for non-participation but is still counted as the disconnecting party.

- **UJ-2. Tahiniyath, the user who cannot stay logged in.**
  - **Persona + context:** Tahiniyath (Bengali, F, paid subscription) opens the app three times a day. Each time the session has expired and the app dumps her to a login screen. She retypes credentials. Sometimes the app goes to home; sometimes it loops.
  - **Entry state:** Returning user, authenticated previously, session likely expired or token was rejected.
  - **Path:** (1) Cold-open app → login screen. (2) Type email + password. (3) Either redirects to home or loops back to login with no error. (4) If premium-gated content, locked out until logged in.
  - **Climax:** A paying user cannot reliably reach the product.
  - **Resolution:** Either she resets her password (high friction) or churns.
  - **Edge case:** Token refresh happens during a call → call drops, app shows login.

- **UJ-3. Vemireddy, the user on a flaky Indian 4G.**
  - **Persona + context:** Vemireddy (Telugu, M, free tier) commutes on a train. He moves between cellular towers; his connection drops 1-second blips every few minutes.
  - **Entry state:** Authenticated, mid-call with a partner.
  - **Path:** (1) 1s network blip. (2) Call disconnects. (3) App shows the partner has "left the call" — no resume. (4) Vemireddy has to re-queue, get re-matched, restart the conversation.
  - **Climax:** The 1s network blip cost him 5+ minutes of session time and broke his flow.
  - **Resolution:** Either he reconnects manually or abandons the call.
  - **Edge case:** Vemireddy switches from WiFi to cellular mid-call. Same outcome.

- **UJ-4. Hari, the user who paid for gender filtering and did not get it.**
  - **Persona + context:** Hari (Hindi, M, paid for "gender filter" add-on) wants to practice with female partners only. He is matched with men. He disconnects. He is warned. He disconnects again. He is suspended.
  - **Entry state:** Authenticated, premium + gender-filter add-on, in matchmaking queue.
  - **Path:** (1) Set gender filter to F. (2) Join queue. (3) Matched with M. (4) Disconnect (rejection of match violation). (5) System counts this as a "strike" against Hari.
  - **Climax:** Hari paid for a filter that does not work and is being punished for complaining about it through the only channel he has (hanging up).
  - **Resolution:** Hari cancels subscription, leaves 1-star review, switches to a competitor.
  - **Edge case:** No female partners online for 10+ minutes; user is matched with male to avoid indefinite wait. (Honest failure mode: should never punish the user for the system's matching failure.)

- **UJ-5. Mridu, the user who got auto-renewed and could not get a refund.**
  - **Persona + context:** Mridu (Bengali, M, paid ₹399 for 1 month) used the app for 7 days, then it stopped working on his device. He emailed support. He waited. He got no reply. The 1-month plan auto-renewed at full price.
  - **Entry state:** Authenticated, paid subscription, days-remaining > 0 when issue began.
  - **Path:** (1) App stops working. (2) Mridu emails support. (3) No auto-reply, no ticket ID. (4) Mridu waits 3 days. (5) Auto-renew fires. (6) Mridu writes a 1-star review referencing screenshots of his unanswered emails.
  - **Climax:** The user is paying for a non-working product and cannot stop paying.
  - **Resolution:** Either he files a chargeback with his bank or he walks away.
  - **Edge case:** User has no way to *see* the auto-renew date in-app. (Multiple reviews cite this.)

---

## 3. Glossary

- **Learner** — A user of AceFluency whose target language is English. Most learners in v1 are Bangladeshi or South Asian.
- **Partner** — The other participant in a 1:1 call. Always another Learner in v1.
- **Match** — A pair of Learners paired by the matching service for a single call session.
- **Call** — A 1:1 voice session hosted in a LiveKit Room. Video is not in scope for v1.
- **Room** — A LiveKit room; one Room hosts one Call at a time.
- **Session** — The duration of a single Call from connect to either party disconnect.
- **Tier** — A subscription level: `free`, `premium`, or `premium_plus` (the gender-filter add-on).
- **Auto-Renew** — Whether the subscription will charge the user again at the end of the current billing period.
- **Strike** — A system marker against a user for behaviors the system flags as abusive (excessive short disconnects, reported harassment). Replaces the current "instant ban" behavior.
- **Cooldown** — A time-limited state during which a user cannot enter the match queue but is *not* banned. Issued after N strikes.
- **Reconnection** — The LiveKit client behavior of resuming a dropped WebRTC session without a fresh match.
- **CEFR** — Common European Framework of Reference for Languages. Levels A1–C2. Used as the primary match-quality filter.
- **Native Language** — The Learner's first language, used to inform matching and AI features. Defaults to Bangla in v1 for the primary audience.
- **Target Language** — Always English in v1.
- **Pronunciation Score** — A per-clip numeric score (0–100) produced by the existing on-device pronunciation model. Stored in `pronunciationScore`.
- **Moderation State** — One of: `clean`, `warned`, `cooldown`, `suspended`, `banned`. A Learner's standing with the system.
- **Support Ticket** — A user-raised issue tracked in the support system. Must have a public ticket ID and an SLA-bound first response.

---

## 4. Features

### 4.1 Authentication & Session Reliability

**Description:** A Learner can sign up, sign in, and stay signed in across app restarts, network blips, and call sessions. The current implementation logs users out and dumps them to the login screen on token-expiry or network changes; this rebuild makes the session the most boring part of the app. Realizes UJ-2, UJ-3. The existing Better-Auth email/password path is kept; phone auth and Google OAuth are added. Sessions are persisted across cold starts and survive dropped connections during calls without forcing re-login.

**Functional Requirements:**

#### FR-1: Persistent session across cold start

[Learner] can cold-open the app after a force-quit, OS reboot, or 7+ day idle period and [reach the home screen without re-entering credentials]. Realizes UJ-2.

**Consequences (testable):**
- Killing the app process and re-opening it within 30 days does not require re-auth.
- Session is stored in `expo-secure-store` on mobile and `httpOnly+secure` cookie on web; both keyed to a rolling refresh token.
- Refresh token is rotated on use; the previous token is invalidated.

**Out of Scope:** Biometric unlock (deferred to v2).

#### FR-2: Silent token refresh during active use

[System] refreshes the access token [in the background, ≤60s before expiry] [without user-visible interruption]. Realizes UJ-2, UJ-3.

**Consequences (testable):**
- A user navigating the app does not see a login screen because of token expiry.
- A user mid-call does not get dropped because of token refresh.

#### FR-3: Phone-number auth (OTP)

[Learner] can sign up or sign in [using a phone number] [via a one-time password]. Realizes review cluster: "can't log in, it says the number and email attached to the phone number does not match" (DAMPU DULOM, others).

**Consequences (testable):**
- Phone OTP works for new sign-ups and existing email users can link a phone to their account without losing data.
- OTP delivery uses an SMS provider with a fallback to voice call for unreachable numbers.
- Phone number is verified, not just collected; unverified numbers cannot enter the match queue.

**Out of Scope:** WhatsApp OTP (deferred).

#### FR-4: Google OAuth

[Learner] can sign in [with a Google account] [on web and mobile]. Realizes UJ-2.

**Consequences (testable):**
- Existing email users can link Google to their account.
- New users can sign up with Google and skip the password step.

**Feature-specific NFRs:**
- Auth failure rate (login button → home screen) ≥ 99% on first attempt for valid credentials; ≥ 95% within 3 attempts for valid credentials.
- Cold-start-to-home-screen p95 ≤ 2.5s on a mid-range Android device (Pixel 4a equivalent).

**Notes:** Existing review cluster (Tahiniyath, Abdul Rehman Khan, Avadhut, KUMAR RAJIV) describes silent logouts and login loops. Root cause is almost certainly missing refresh + missing secure storage; do not skip the "silent refresh" requirement.

### 4.2 Call Reliability & Reconnection

**Description:** A Learner on a flaky network can survive a 1-second blip without losing the call. A 5-second blip triggers a visible-but-quiet reconnection state, not a "your partner left" dead-end. Calls only end when a user explicitly ends them. Realizes UJ-3, UJ-1. The existing LiveKit token endpoint stays; the rebuild adds server-side room lifecycle, client-side reconnection UX, and explicit end-of-call semantics.

**Functional Requirements:**

#### FR-5: Server-managed Call rooms

[System] creates, joins, and tears down LiveKit Rooms [for 1:1 calls] [in response to match events]. Realizes UJ-3.

**Consequences (testable):**
- When a Match resolves, the system creates a Room named `call-{matchId}` and issues both participants a join token.
- When both participants disconnect or the call is explicitly ended, the Room is closed within 30s.
- Rooms are not reused across Matches; each Match gets a fresh Room.

#### FR-6: Client-side reconnection on network blip

[Learner] experiences [a network blip of up to 30 seconds] [as a brief "reconnecting" state] [rather than a call drop]. Realizes UJ-3.

**Consequences (testable):**
- A 1s blip results in ≤500ms of audio dropout, no UI change visible to the partner.
- A 5s blip shows a "reconnecting…" indicator to the affected user only; the partner sees no change.
- A 30s+ blip results in an explicit "connection lost" prompt asking the user to retry or end the call; the call is not silently destroyed.
- Reconnection uses LiveKit's ICE-restart path, not a fresh token / new Room.

#### FR-7: Call-end is always explicit

[Learner] always [sees a clear "Call ended" screen] [when a call ends] [with a reason: "you ended the call", "your partner ended the call", "connection lost"]. Realizes UJ-1, UJ-3.

**Consequences (testable):**
- "Connection lost" is never labeled "your partner left" — the system distinguishes the two.
- "Your partner left" triggers a 10-second "waiting…" window before the screen appears, to handle a partner's own reconnect.

**Feature-specific NFRs:**
- Audio round-trip p95 ≤ 400ms on a 4G connection with 200ms jitter; p99 ≤ 700ms.
- Reconnection success rate (1s blip → fully resumed) ≥ 95%.
- Reconnection success rate (5s blip → fully resumed) ≥ 80%.

**Notes:** Reviews from Vemireddy, Anshu Ram, and others cluster on this exact failure. The LiveKit SDK already supports the underlying ICE-restart path; the missing piece is the UX layer and the server-side room lifecycle.

### 4.3 Matchmaking & Filters

**Description:** A Learner is matched with a partner at the right level, with the right filters, in a reasonable time. The current implementation uses cosine similarity on profile embeddings with a CEFR ±1 filter; the rebuild keeps the embedding-based match and adds the missing filter infrastructure (gender, intent, language). Realizes UJ-4. The "no partners online, waiting 20+ minutes" failure mode (Shadab Shaikh, Imteyaz Asgar) is acknowledged but not solved in v1.

**Functional Requirements:**

#### FR-8: Gender filter (premium_plus)

[Learner] can set [a gender preference] [for their matches] [and the system only matches within that preference]. Realizes UJ-4.

**Consequences (testable):**
- The user table gains a `gender` field (enum: `male`, `female`, `nonbinary`, `undisclosed`). Schema: `packages/db/src/schema/auth.ts`.
- The match service filters by `requestedGender == partner.gender` when a filter is set. Logic: extend `packages/api/src/routers/models.ts` `matchPartners` with a gender predicate.
- A match is never returned that violates a Learner's stated preference.
- If no valid match exists within 60 seconds, the user sees an honest "no matches available" state, not a forced match.
- **Empty-pool fallback:** if no valid match is available for 5 minutes, the system offers the user the option to (a) keep waiting, or (b) drop the gender filter for the current session and accept any partner. The user picks; the system never auto-bypasses the filter.
- The system logs a per-day count of "would-have-matched-but-filter-rejected" events so the team can see when the filter is starving the user.

**Out of Scope:** Filtering by age, country, or interests in v1.

#### FR-9: Native language field

[Learner] has [a native language] [set during onboarding] [that informs matching and AI features].

**Consequences (testable):**
- The user table gains a `nativeLanguage` field; defaults to `bn` (Bangla) for the primary audience; supports `hi`, `ur`, `en`, `ta`, `te` in v1.
- Profile embedding computation uses the user's actual `nativeLanguage`, not a hardcoded value.
- The user can change `nativeLanguage` from settings at any time.

#### FR-10: Match timeout with honest state

[Learner] waiting for a match [for >60s] [sees a real-time status: "Looking for a partner…", then "No partners online right now — we'll keep trying"].

**Consequences (testable):**
- Status updates every 15s.
- After 5 minutes of no match, the user is offered the option to lower filter strictness (drop gender filter) or exit the queue.

### 4.4 Moderation & Strike System (Replaces Ban-by-Disconnect-Count)

**Description:** A Learner who disconnects many calls in a row is *not* instantly banned. Instead, the system uses a graduated response that distinguishes the user being malicious from the user being the victim of bad matches. Realizes UJ-1, UJ-4. The current behavior — three to five disconnects in a window → 48-hour ban — is the single most-cited cause of 1-star reviews (D Mail, Sumit, Riyal, Hari, and the DULOM cluster). It must be replaced.

**Functional Requirements:**

#### FR-11: Graduated strike system

[System] responds to [short, repeated disconnects] [with a graduated sequence: warn → warn → cooldown → cooldown → review-by-human → ban]. Realizes UJ-1, UJ-4.

**Consequences (testable):**
- A user disconnecting 3 short calls in a row gets a non-blocking warning: "We noticed you ended 3 calls quickly. If partners aren't a good fit, use the 'Skip' button to find a new match."
- 5 short disconnects in 24h → 1-hour cooldown (queue-blocked, not banned, can still chat / use free features). `[NOTE FOR PM: 1h vs. 2h, 24h vs. 48h are tuning parameters; current 48h ban is exactly the failure mode UJ-1 describes, so the new ceiling must be visibly shorter.]`
- 10 short disconnects in 24h → 24-hour cooldown + automatic review by a human moderator.
- A "short" disconnect is defined as <30s of audio before end. Disconnects after a real conversation do not count. `<30s threshold is a starting value; tune from data in v2.`
- **Skip is a first-class in-call action**: ends the current call, returns the user to the queue, does not count as a strike. *Dependency: this FR assumes an in-call Skip button exists; the current codebase has no Skip affordance — the UX scope must add it (owned by `bmad-ux` downstream).*

#### FR-12: Distinguish victim from aggressor

[System] does not count a disconnect [as a strike] [if the user reported the partner for non-participation, abuse, or technical failure within 60s of ending the call]. Realizes UJ-4.

**Consequences (testable):**
- "Report" during or within 60s after a call automatically voids the strike for the reporting user.
- The reported partner's account is flagged for review.

#### FR-13: Visible moderation state

[Learner] can see [their own moderation state] [in profile settings] [with a plain-language explanation of why, and what they can do].

**Consequences (testable):**
- Settings → "Account standing" shows: clean / warned / cooldown-until-X / suspended-pending-review / banned-with-reason.
- Each state has a "Contact support" link and a human-readable explanation.

**Feature-specific NFRs:**
- A user who has not disconnected a single call in 30 days has zero strikes.
- A user who averages 1 short disconnect per session has zero strikes.

**Notes:** Multiple reviews explicitly describe being punished for a partner's behavior the user could not control. The fix is not "remove all enforcement" — it is "make the enforcement match the actual harm, and give the user a way out."

### 4.5 Subscription, Billing & Refund Transparency

**Description:** A Learner can see what they are paying for, when they are paying next, and how to stop. Realizes UJ-5. The current implementation has no subscription infrastructure in the codebase (per the architecture inventory). This feature is built from scratch in the rebuild using **SSLCommerz** as the payment gateway for Bangladesh (BDT, resolved: Open Question 1, 2026-06-09) — chosen for native BDT support, 2-second checkout, and direct bank-debit redirects.

**Multi-market note:** Screenshots confirm the live app serves *two* markets — Bangladesh (BDT 800/1600/2500) and India (INR 99/206/2500). SSLCommerz is BD-only; the India market needs a parallel payment provider (Razorpay, Cashfree, or PayU — Open Question 9, added). The rebuild must support both PSPs in parallel; the PRD-level requirement (visible subscription, cancellable, refundable) holds for both, but the payment-provider-specific implementation is dual.

**Functional Requirements:**

#### FR-14: Visible subscription state

[Learner] can see [their current plan, next billing date, and auto-renew status] [in settings]. Realizes UJ-5.

**Consequences (testable):**
- Settings → "Subscription" shows: current tier, started-on, renews-on, auto-renew on/off, payment method last 4 digits, total billed to date.
- Auto-renew toggle is editable in-app and takes effect at the *end* of the current billing period, not immediately.

#### FR-15: Cancellation preserves access until period end

[Learner] who cancels [retains access to paid features] [until the end of the paid period]. Realizes review cluster: "If a user pays for a 1-year subscription and then disables auto-renewal, access should continue until the subscription expires" (preetam pawar).

**Consequences (testable):**
- Cancelling auto-renew does not immediately downgrade the user.
- The user sees a clear "Your plan is paid until [date]" message.

#### FR-16: In-app support ticket with ticket ID

[Learner] can submit a support issue [from settings] [and receive a ticket ID and an SLA-bound first response]. Realizes review cluster: 3-5 day support waits, no ticket IDs.

**Consequences (testable):**
- "Help" → "Contact support" opens an in-app form.
- Submission returns a ticket ID and an estimated first-response time.
- First-response SLA: 24 hours for paying users, 72 hours for free users. *Organizational dependency: this SLA assumes the team has committed to a support rota, or that an AI-assisted tier-1 response path exists. Without one of these, the SLA is a code promise that the org cannot meet. Flag at Finalize.*
- The system *measures* SLA compliance (time from ticket open to first human response) and exposes the metric internally, even if the team is offline — this separates "did we respond in time" from "is the team staffed."
- Status is visible in settings under "My tickets".

**Feature-specific NFRs:**
- All paid state changes (purchase, renewal, cancel, refund) are reflected in the app within 60s.
- Refund requests for a non-working product are processed within 7 days (see FR-20).

#### FR-20: Refund mechanism for non-working product

[Learner] can request [a refund] [for a non-working product] [via in-app flow with a defined decision rule]. Realizes review cluster: Mridu, Ajeet Kumar, preetam pawar, Sumit, Ushama — all describe paying for a product that did not work and being unable to recover the money.

**Consequences (testable):**
- "Subscription" → "Request refund" opens a flow that classifies the request into one of three paths:
  - **Auto-approve**: triggers include (a) ≥3 critical app crashes in the user's first 7 days, (b) the user never connected to a call (no completed sessions), (c) reported login failure lasting >72 hours. Auto-approve refunds within 24 hours.
  - **Auto-deny with explanation**: triggers include (a) refund requested >14 days after charge, (b) account has >5 completed sessions. The user gets a plain-language explanation, not a silent no.
  - **Human review**: everything else. SLA: 7 days for a decision.
- Refund grants do not require a support email; the decision is shown in-app.
- Cancelling auto-renew does not trigger a refund — it preserves access until period end (FR-15).

**Out of Scope:** Partial refunds, proration logic, refund for a free trial. Deferred to v2.

**Notes:** Pricing tiers, payment provider, and the exact trigger thresholds belong to `addendum.md` and the Open Question 2 resolution. The shape — auto / deny-with-reason / human — is the requirement; the thresholds are tuning. **Refund execution uses the SSLCommerz Refund API** (sandbox at `https://sandbox.sslcommerz.com/validator/api/refund`; production at the live equivalent). All auto-approve refunds post a refund record to SSLCommerz first, then mark the user's billing record as refunded locally. Failed refund posts fall through to the human-review path.

**Notes:** Pricing, payment provider, and refund policy details move to `addendum.md` as they are design decisions, not core requirements.

### 4.6 Mobile-Specific Stability

**Description:** A Learner on a mid-range Android device on a Bangladeshi cellular network has an app that does not freeze, does not lose state on backgrounding, and does not corrupt the auth state on reinstall. Realizes review cluster: "App is not working properly" (Pranav), "After reinstall it gets stuck" (Ansa), "freeze on Pixel 8 Pro" (Ruchika).

**Functional Requirements:**

#### FR-17: State preservation across app backgrounding

[Learner] who backgrounds the app [for up to 30 minutes] [returns to the same screen with the same call state if a call was active]. Realizes UJ-3.

**Consequences (testable):**
- Backgrounding during a call does not end the call.
- Backgrounding during matchmaking does not remove the user from the queue.

#### FR-18: Crash resilience

[Learner] who force-quits the app mid-call [returns to a "Call ended — connection lost" state, not a frozen UI]. Realizes UJ-2, UJ-3.

**Consequences (testable):**
- App launch after a force-quit mid-call shows the home screen, not a frozen call UI.
- The user's moderation state is unchanged (no false strikes from a crash).

#### FR-19: Reinstall preserves account

[Learner] who uninstalls and reinstalls [signs in with the same phone/email] [and gets their account, subscription, and history back]. Realizes review cluster: "user not registered" on reinstall (Sarati), "after reinstalling they only provide logging using Gmail but previously we logged in using phone number" (KUMAR RAJIV).

**Consequences (testable):**
- Reinstall + same email/phone = full account restore.
- Subscription state is server-authoritative; never lost on reinstall.

---

## 5. Non-Goals (Explicit)

- **AI voice tutors / 1:1 native-speaker tutoring.** The product is peer-to-peer. We are not building an agent marketplace. (AceFluency already runs some AI features; out-of-scope for *this* rebuild.)
- **Video calling.** Voice-only in v1. Video requires network stability we cannot promise to all primary-market users and adds significant battery drain.
- **Group calls / multi-party rooms** for practice. Voice Clubs exist as a separate feature set; not part of the rebuild.
- **Structured curriculum / lessons.** The product is reps, not lessons.
- **Native-speaker directory or community-sourced content feed.** Out of scope.
- **B2B / corporate / reseller / institutional licensing.** Out of scope for v1.
- **Web-first product parity.** Web is supported (auth, settings, billing) but is not a primary surface; mobile (Android + iOS via Expo) is primary. [ASSUMPTION: 90%+ of active users are on mobile based on the review source.]
- **A/B testing platform / experimentation infra.** Defer to v2. The rebuild is shipped as one consistent experience.

## 6. MVP Scope

### 6.1 In Scope

- §4.1: All four FRs (FR-1..FR-4) — persistent session, silent refresh, phone OTP, Google OAuth.
- §4.2: All three FRs (FR-5..FR-7) — server-managed rooms, client reconnection UX, explicit call-end states. **[Phase-blocker: Open Question 6 must resolve before FR-6/SM-1 ship values are confirmed.]**
- §4.3: All three FRs (FR-8..FR-10) — gender filter (with empty-pool fallback), native language field, match timeout with honest state.
- §4.4: All three FRs (FR-11..FR-13) — graduated strikes, victim/aggressor distinction, visible moderation state. **[Dependency: Skip button UX is owned by `bmad-ux` downstream.]**
- §4.5: All four FRs (FR-14..FR-16, FR-20) — visible subscription state, cancellation preserves access, in-app tickets with SLA, refund mechanism. **[Phase-blocker: Open Question 2 must resolve before FR-20 trigger thresholds are final.]**
- §4.6: All three FRs (FR-17..FR-19) — backgrounding, crash resilience, reinstall account restore.

### 6.2 Out of Scope for MVP

- **AI conversation partner / live pronunciation feedback during call** — defer to v2; pronunciation scoring (existing) stays for after-call review. `[NOTE FOR PM: keep on roadmap — review cluster (Raman Gupta, Keertika) requests this.]`
- **Friend list / re-match-with-same-partner** — defer; conflict with anonymous matching. Tutan Das cluster. `[NON-GOAL for MVP]`
- **Native-speaker / English-fluency-tester onboarding flow** — defer. `[NON-GOAL for MVP]`
- **In-app subscription tier comparison / paywall A/B testing** — v2.
- **Voice Clubs (group discussion rooms)** — existing feature, not modified in this rebuild.
- **Live screen orientation lock / split-screen stability** — addressed in §4.6 indirectly; explicit testing deferred.
- **iOS-specific native polish** — Expo handles cross-platform; we ship on Android first per primary market, iOS in same release.
- **Detailed refund policy design** — see `addendum.md`; the policy itself is an Open Question.

## 7. Success Metrics

Each SM cross-references the FRs it validates. Counter-metrics prevent optimizing the wrong thing.

**Primary**

- **SM-1**: Disconnect-during-call rate (calls ended by network or unexplained disconnect / total calls) ≤ 5%. Validates FR-6, FR-7.
- **SM-2**: App-store rating 7-day rolling average ≥ 4.0 (currently 2.0–3.5 in sampled reviews). Validates §4.1, §4.2, §4.4, §4.5 (the four user-trust pillars).
- **SM-3**: First-call completion rate (new user → completes first 5-min call) ≥ 70% (currently dragged down by login loops and bad matches). Validates §4.1, §4.3.
- **SM-4**: Support first-response time p95 ≤ 24h (paying) / 72h (free). Validates FR-16.
- **SM-5**: Subscription refund request rate ≤ 2% of active paid users per month. Validates §4.5.

**Secondary**

- **SM-6**: Match-wait-time p95 ≤ 45s for unfiltered queue, ≤ 90s for gender-filtered queue. Validates §4.3.
- **SM-7**: Cold-start-to-home p95 ≤ 2.5s. Validates §4.1.
- **SM-8**: Reconnect success rate (1s blip) ≥ 95%. Validates FR-6.
- **SM-9**: Premium gender-filter fulfillment rate ≥ 90% (i.e., the filter is honored, not silently bypassed). Validates FR-8.
- **SM-10**: Cancellation flow completion (user reaches "your plan is paid until [date]") ≥ 95%. Validates FR-15.

**Counter-metrics (do not optimize)**

- **SM-C1**: Match volume per minute per user. Do *not* optimize for raw match volume; doing so will push the system to bypass filters (which is the failure UJ-4 is about). Counterbalances SM-6.
- **SM-C2**: Total minutes of call time per user per week. Do *not* optimize for session length; this would push the system to surface long-but-low-quality sessions and to over-engineer against natural short disconnects. Counterbalances SM-3.
- **SM-C3**: Free-to-paid conversion rate. Do *not* over-optimize; the current Play Store review set is full of complaints from users who *did* pay and felt mistreated. Optimizing for conversion at the expense of trust is a known category failure. Counterbalances SM-2.
- **SM-C4**: Support ticket volume (per 1k users). Volume is fine to rise temporarily as users discover the in-app ticket path; the SLA is the metric. Counterbalances SM-4.

## 8. Open Questions

1. **Payment provider for Bangladesh.** ~~Stripe is not ideal for BD Taka (BDT). Local options: bKash, Nagad, SSLCommerz.~~ **RESOLVED (2026-06-09):** **SSLCommerz.** Chosen for native BDT support, 2-second checkout, bank-debit redirect, integrated refund API, and direct BD market coverage. Refund flow in FR-20 uses the SSLCommerz Refund API. Architecture owns sandbox-vs-live credential setup and webhook signature verification. Owner: Engineering. (Was: Engineering Lead; status: closed at this PRD.)
2. **Refund policy.** ~~Specifically: under what conditions is a user auto-refunded (e.g., 3+ crashes in 7 days), and what is the human-review path for gray-area cases?~~ **PARTIALLY RESOLVED** — FR-20 (in §4.5) defines the three-path structure (auto-approve / auto-deny / human review) and the SLA. **Open**: exact trigger thresholds (3 crashes / 7 days / etc.) and the grace window (14 days proposed); integration with the SSLCommerz Refund API is concrete. **Note (2026-06-09):** PRD is marked `status: final` despite this open question, because the *structure* of FR-20 is the requirement; thresholds are tuning parameters owned by PM + Legal and can be set without changing the PRD. The three-path matrix in `addendum.md` §B has the starting values. Owner: PM + Legal + Engineering.
3. **Gender field inclusivity.** "Male / Female / Non-binary / Undisclosed" assumes a non-binary option; is this the right set for the primary market, or does it add friction without value? Owner: PM. Revisit at UX stage.
4. **Push notifications scope.** Re-engagement ("you haven't practiced in 3 days") vs. transactional ("your match is ready") — what is the policy? Out of scope for *this* PRD but blocks a v2 spec. Owner: PM.
5. **AI agent (LiveKit) integration.** The LiveKit docs (`docs/livekit.md`) describe an Agents framework. Is the rebuild paving the way for an AI conversation partner in v2? If yes, the room lifecycle in FR-5 should be designed for handoff. If no, keep simple. Owner: PM + Architecture.
6. **LiveKit Cloud vs. self-hosted.** ~~Cost vs. reliability tradeoff for the BD market.~~ **RESOLVED (2026-06-09):** **LiveKit Cloud.** Chosen for global mesh SFU (users connect to nearest edge — critical for the BD market where users frequently roam across the BD/IN border), 99.99% uptime SLA, native fit for the future AI agent v2 (Open Question 5), and zero operational overhead for a small team. The reconnect SLOs in FR-6 and SM-1 / SM-8 are now stated under confirmed Cloud topology. Migration path to self-host remains open (LiveKit SDK is portable; the connection endpoint is the only delta). Owner: Engineering (sandbox creds + production project setup).
7. **Match quality measurement.** ~~What does "good match" mean operationally?~~ **PARTIALLY RESOLVED via screenshot evidence (2026-06-09):** a post-call "Rate your last caller" flow already exists in the current app (1–5 stars + optional comment + Skip). The rebuild must (a) preserve this flow, (b) ensure the rating *data* flows into the matching service as a quality signal (low-rated partners surface lower in `matchPartners`), and (c) add an explicit "Did this partner help you practice?" question to anchor ratings to practice-quality rather than vibe. **Open at finalize:** exact weighting of rating in the matching score, retention policy, and whether low-rated users get a warning before the strike system fires. Owner: PM + Engineering.
8. **SMS provider for BD/IN markets.** FR-3 depends on OTP delivery in markets with weak SMS deliverability. **Likely path:** SSLCommerz has affiliated SMS-gateway partners; if engineering prefers to keep payment + SMS on one provider, this resolves trivially. Otherwise: Twilio, MessageBird, or BD-local. Owner: Architecture. Revisit at Finalize if MVP launches BD-only.
9. **Payment provider for India.** *(Added 2026-06-09 after screenshot review.)* Screenshots confirm the live app shows INR prices (₹99, ₹206, ₹2500) in addition to BDT. SSLCommerz does not serve India. The rebuild needs a parallel India PSP — candidates: **Razorpay**, **Cashfree**, **PayU**. Each has refund APIs; SSLCommerz's refund matrix in `addendum.md` §B must be replicated for the India provider. Owner: Engineering. Revisit at Finalize before MVP ships India pricing.

## 9. Assumptions Index

- §1: 4-of-5 Bangladeshi adults have spoken-English anxiety — sourced from `about.md`, not independently verified. Mark for PM confirmation.
- §2.2: B2B / corporate out of scope — assumed by absence in current product; not explicitly stated by user.
- §2.3 UJ-1..UJ-5: Persona names are lifted from `ratings-and-reviews.md` reviewers; assumed to represent recurring patterns rather than specific individuals for product purposes. Use as archetypes, not as research participants.
- §3 Native Language defaults: default to `bn` (Bangla) is an assumption about the primary audience based on `about.md`; not independently verified.
- §4.1 FR-3: SMS OTP with voice fallback is the standard pattern; specific provider selection is Open Question 8.
- §4.2 Feature-specific NFRs: 400ms p95 audio round-trip is a reasonable default for a WebRTC voice app; should be confirmed against LiveKit's published benchmarks in architecture.
- §4.3 FR-10: 60s match-wait threshold is opinionated; should be re-checked against usage data in v2.
- §4.4 FR-11: "Short" disconnect = <30s is a starting threshold; should be tuned from data.
- §4.4 FR-11: Cooldown durations (1h, 24h) are starting values; current 48h ban is the failure UJ-1 describes, so the new ceiling must be visibly shorter.
- §4.4 FR-11: Skip button is a hard dependency. Assumed to be added by `bmad-ux` downstream; if Skip does not exist, FR-11 cannot fully work.
- §4.5 FR-16: 24h/72h SLA is a reasonable industry baseline; should be confirmed against support capacity or AI-assisted tier-1.
- §4.5 FR-20: Trigger thresholds (3 crashes / 7 days / never-connected-to-call / 72h login failure / 14-day grace) are starting values; should be tuned from data in v2.
- §5: 90%+ of active users on mobile is an inference from the review source, not measured.
- §7 SM-2: "Currently 2.0–3.5" is read off the sampled reviews; the actual store rating is unknown.
- All other unstated-but-necessary parameters (UI design tokens, exact copy, navigation structure) are deferred to UX and architecture.
