# AceFluency — Glossary

<!-- Authored from codebase evidence. Terms marked `[inferred]` were derived by reading
     code, not confirmed by the team. Treat `[inferred]` as provisional. -->

Domain vocabulary for AceFluency, a voice-first English speaking-practice app for South
Asian learners. Two surfaces share this vocabulary: a native Expo app (primary) and a
Next.js web admin (operations).

## Learners and level

**Learner** — A user practicing spoken English; the primary persona.
: The only entity most tables reference. `[source: prd-community-2026-06-09/prd.md §3]`

**Partner** — The other participant in a 1:1 call; always another Learner.
: A call holds exactly two, stored as `participantA` and `participantB` on the call room.
`[source: prd.md §3; packages/db/src/schema/rebuild.ts callRoom]`

**Match** — A pair of Learners paired by the matching service for one call.
: Each match gets exactly one room, named `call-{matchId}`; rooms are never reused across
matches. `[source: prd.md §3, FR-5; rebuild.ts roomName]`

**CEFR** — Common European Framework of Reference; levels `A1 | A2 | B1 | B2 | C1 | C2`.
: The primary match-quality filter, and the difficulty scale for content items.
`[source: prd.md §3; rebuild.ts cefrLevel; recommendations.ts contentItem.cefrLevel]`

**Native language** — The Learner's first language, set at onboarding.
: Informs matching and AI features. Values `bn | hi | ur | en | ta | te`, defaulting to
`bn`; changeable from settings at any time.
`[source: prd.md FR-9; rebuild.ts userProfile.nativeLanguage]`

**Gender preference** — A filter on who a Learner will be matched with.
: Values mirror the gender enum; `null` means no filter. A paid (`premium_plus`) feature —
a match is never returned that violates it.
`[source: prd.md FR-8; rebuild.ts userProfile.genderPreference]`

**Target language** — Always English.
: Matching is uni-directional toward English practice; AceFluency is not a platform for
learning Bangla or Hindi. `[source: prd.md §3, §2.2]`

## Sessions and rooms

**Call** — One live 1:1 voice conversation between two matched Learners.
: Hosted in a LiveKit room. Voice only — video is a non-goal. The killer metric is
talk-time, not session count. `[source: prd.md §3, §5]`

**Call room** — The server-side record of one Call; one per match.
: Carries participants, status, end reason, who ended it, duration, reconnect count, and
average round-trip latency. `[source: rebuild.ts callRoom]`

**Call status** — The lifecycle of a call room.
: Values `pending | connecting | active | reconnecting | ended | failed`. `reconnecting` is
first-class, not a synonym for `ended`. `[source: rebuild.ts callStatusEnum]`

**Call end reason** — Why a call stopped.
: Values `user_ended | partner_ended | connection_lost | skip | timeout | system_error`. The
rebuild insists "connection lost" is never rendered as "your partner left".
`[source: rebuild.ts callEndReasonEnum; prd.md FR-7]`

**Call record** — The append-only log written when a room closes.
: Separate from the room itself, and carrying a wider reason vocabulary: `disconnect |
explicit | skip | partner_skipped | timeout | connection_lost | partner_ended`.
`[source: packages/db/src/schema/call.ts callRecord]`

**Reconnection** — Resuming a dropped WebRTC session in the *same* room.
: Uses LiveKit's ICE-restart path, not a fresh token or a new room. A 1s blip resumes
invisibly; a 5s blip shows a quiet indicator to the affected user only; 30s+ yields an
explicit "connection lost" prompt. `[source: prd.md §3, FR-6; addendum.md §A]`

**Skip** — A first-class in-call action that ends the call and returns the Learner to the queue.
: Does not count as a strike. Rate-limited to once per 5s; three Skips in a session produce a nudge, not a penalty. The
strike-free rejection path, and load-bearing: without it, hanging up is the only way to
reject a bad match. `[source: prd.md FR-21; addendum.md §C]`

**Match queue** — Where a Learner waits to be paired.
: Wait time is p95 ≤ 45s unfiltered and ≤ 90s gender-filtered. After 60s the user sees an
honest status, not a spinner. `[source: prd.md FR-10, SM-6; addendum.md §E]`

**Rating-integrated matching** — Post-call ratings feed back into match selection.
: Partners averaging below 2.5 stars surface lower in the queue. Ratings are a quality signal
for ordering, not a moderation trigger. `[source: prd.md FR-23, OQ-7]`

**Empty-pool fallback** — When a paid filter cannot be satisfied, the system *offers* to drop the filter.
: Never auto-applied — the user picks. A per-day count of "would-have-matched-but-filter-rejected" events tracks
how often the filter starves the user. `[source: prd.md FR-8]`

**Voice club** — A topic-based group discussion room, moderated by a host.
: Participants are host, speaker, or listener, and speakers raise a hand. The rebuild must
not break club rooms when changing 1:1 call lifecycle.
`[source: PRODUCT.md core loop 2; prd.md FR-22]`

## Moderation

**Moderation state** — A Learner's standing with the system.
: Values `clean | warned | cooldown | suspended | banned`. Surfaced in Settings → "Account
standing" with a plain-language reason and a "Contact support" link.
`[source: rebuild.ts moderationStateEnum; prd.md §3, FR-13]`

**Graduated strike system** — The replacement for instant-ban-on-disconnect-count.
: Escalates `warn → warn → cooldown → cooldown → review-by-human → ban`. Thresholds: 3
short disconnects → warn, 5 in 24h → 1-hour cooldown, 10 in 24h → 24-hour cooldown + human
review. Starting values, not tuned to data. `[source: prd.md FR-11; addendum.md §C]`

**Short disconnect** — A call ending in under 30 seconds wall-clock.
: Measured from both participants joining to one disconnecting. Only these count toward the
strike ladder; a disconnect after real conversation (≥30s) does not.
`[source: prd.md FR-11; threshold marked provisional]`

**Strike** — An append-only marker against a user for flagged behavior.
: Triggers are `short_disconnect`, `reported`, or `skip_abuse`. Stored as per-call records,
never as a mutating counter alone. `[source: rebuild.ts strikeEvent.triggerType]`

**Victim vs aggressor** — The distinction the whole strike system exists to make.
: Reporting a partner for non-participation, abuse, or technical failure within 60s of
ending a call auto-voids the reporting user's strike and flags the reported partner for
review. A user who reports is never punished for hanging up. `[source: prd.md FR-12]`

**Partner report** — A Learner's report on the other participant, filed during or within 60s of a call.
: Reasons `non_participation | abuse | technical_failure | other`. Reports are the void
mechanism, not a punishment applied to the reporter.
`[source: rebuild.ts partnerReport.reason; prd.md FR-12]`

**Voided strike** — A strike neutralized because the user reported their partner in time.
: Carries `voidedAt`, a `voidedReason` such as `partner_reported`, and the `reportId` that
caused it. `[source: rebuild.ts strikeEvent voided fields]`

**Flagged for review** — A user marked for human moderator attention.
: Set when they are the subject of a partner report. Distinct from being banned.
`[source: rebuild.ts userProfile.flaggedForReview]`

**Ban reason** — The admin-set text stored only while a user is banned.
: Required so the user can see why. `[source: rebuild.ts userProfile.banReason]`

**"Bad call" flag** — The post-disconnect reporting affordance: a 1-tap flag with a reason.
: Three flags in 24h produces a 1-hour cooldown, not a 2-day ban. First-time users get three
free flags before any cooldown applies. `[inferred — from engineering specs, not the PRD
glossary]`

## Membership and payment

**Tier** — The subscription level: `free | premium | premium_plus`.
: `premium_plus` is the gender-filter add-on.
`[source: rebuild.ts tierEnum; prd.md §3]`

**Subscription** — One record per active or past subscription.
: Carries the provider subscription id, amount in the smallest currency unit, currency
(`BDT | INR`), period, and status `active | cancelled | expired | refunded`.
`[source: rebuild.ts subscription]`

**Auto-renew** — Whether the subscription will charge again at period end.
: Editable in-app, and it takes effect at the *end* of the current period, not immediately.
Disabling it never downgrades the user on the spot. `[source: prd.md §3, FR-14, FR-15]`

**Cancellation preserves access until period end** — Cancelling auto-renew leaves paid features working.
: Access continues until the paid date, with a clear "your plan is paid until [date]" message. `[source: prd.md FR-15]`

**One-tap cancel** — Cancelling is one tap: no confirmation survey, no hold flow.
: Aimed at removing the auto-renew "scam" perception that drives ghost-call churn.
`[inferred — from F5.3 engineering spec, not confirmed in the PRD]`

**Payment transaction** — One row per checkout attempt.
: Carries the provider transaction id, tier, billing period (`monthly | annual`), amount in
poisha, and status `pending | completed | failed | cancelled`.
`[source: rebuild.ts paymentTransaction]`

**Payment provider** — `sslcommerz | bkash | stripe`.
: SSLCommerz is the confirmed Bangladesh gateway (native BDT, bank-debit redirect, integrated
refund API); India needs a parallel provider.
`[source: rebuild.ts paymentProviderEnum; prd.md OQ-1, OQ-9]`

**Refund request** — A refund classified into exactly one of three paths: `auto_approve`, `auto_deny`, or `human_review`.
: Auto-approve requires an explicit fault *and* a recent purchase: ≥3 critical crashes within 7
days of the charge, no completed session within 14 days, or a reported login failure lasting
over 72h within 14 days. Auto-deny requires **both** more than 5 completed sessions **and**
more than 14 days since the charge — either condition alone routes to human review, so a light
user who recently hit a fault is never auto-denied. Auto-approve is evaluated first and wins.
Everything else goes to human review with a 7-day SLA.
`[source: prd.md FR-20; threshold matrix resolved in epic-005-story-053 §Decision Records, 2026-10-11 — supersedes the contradictory OR rule in addendum.md §B]`

**Refund status** — The state of a refund request.
: Values `pending | auto_approved | auto_denied | human_review | approved | denied | processing |
completed`. An auto-deny carries a plain-language denial reason — never a silent no.
`[source: rebuild.ts refundStatusEnum]`

**Auto-deny threshold** — The two conditions that must *both* hold before a refund is refused without human input.
: Deliberately conjunctive. An earlier OR reading would have refused the exact learner this
feature exists for — one short call followed by 72 hours of being unable to sign in.
`[source: epic-005-story-053 §Decision Records]`

**Crash event** — A critical client failure recorded per user.
: Types `force_close | anr | black_screen`, with app version, OS version, device model, and
stack trace. Feeds refund auto-approval and must never itself produce a strike.
`[source: rebuild.ts crashEvent]`

## Support

**Support ticket** — An in-app issue with a public ticket number.
: Numbered in the form `TKT-20260613-001`, so the user gets a reference instead of an email
black hole. Status `open | pending | resolved | closed`.
`[source: rebuild.ts supportTicket]`

**Ticket SLA** — A first-response deadline bound to the ticket.
: 24h for paying users, 72h for free users. Compliance is measured even when the team is
offline, which separates "did we respond in time" from "is the team staffed."
`[source: rebuild.ts supportTicket.slaDeadline; prd.md FR-16]`

**Ticket message** — An entry in a ticket's thread.
: Sent by a `user`, an `agent`, or the `system`, and marked internal when it is not for the
reporter's eyes. `[source: rebuild.ts supportTicketMessage]`

## Assessment

**CEFR placement** — A learner's assessed level over time, with the source recorded.
: Sources `mcq | voice | voice-sync`. Re-graded server-side when an on-device result shows
the server score more than one level above the mobile result.
`[source: packages/db/src/schema/models.ts cefrPlacement]`

**Pronunciation score** — A 0–100 score per recorded clip, against expected text.
: Carries per-word errors. Produced by a wav2vec2 CTC model and CEFR-aligned. Used for
analytics, peer comparison, and per-user progress.
`[source: models.ts pronunciationScore; packages/models/onnx-pron/README.md]`

**Profile embedding** — A 384-dim vector over a learner's CEFR, interests, goals, and native language.
: Also covers learning style. Computed with `bge-small-en-v1.5`. Shared by partner matching and content recommendation —
the same profile that finds a conversation partner finds learning content.
`[source: models.ts userProfileEmbedding; recommendation-engine PRD §3]`

## Content and recommendation

**Content item** — A piece of learning content.
: Types `video | article | exercise | dialogue`, with a CEFR level, tags, and optional
duration and URLs. `[source: packages/db/src/schema/recommendations.ts contentItem]`

**User interaction** — A recorded action on a content item.
: Actions `view | like | bookmark | complete | share | dismiss`. `dismiss` and `complete`
permanently exclude an item from candidates; the others may reappear after a 7-day decay
with a score penalty.
`[source: recommendations.ts userInteraction; recommendation-engine PRD FR-9]`

**User preference** — Stated interests, goals, preferred types, a CEFR override, and a daily goal.
: Daily goal is in minutes; also carries notification settings. The CEFR override beats the auto-detected level. Daily goal defaults to 15 minutes.
`[source: recommendations.ts userPreference]`

**Recommendation score** — A precomputed 0.0–1.0 score per user-content pair.
: Carries a `reason` string and a 24-hour expiry. Score types `content | collaborative |
hybrid | trending`. Recomputed on demand when stale.
`[source: recommendations.ts recommendationScore]`

**Hybrid score** — The primary scoring algorithm.
: Embedding cosine similarity × 0.4, CEFR level closeness × 0.3, tag overlap with interests
× 0.2, content-type preference × 0.1, capped at 1.0. Deterministic — no randomness.
`[source: recommendation-engine PRD §3, FR-8]`

**CEFR ±1 filter** — The candidate-pool restriction.
: A B1 learner sees A2, B1, and B2 only — applying to both content and partner matching.
`[source: recommendation-engine PRD §3; prd.md §4.3]`

**Admin procedure** — An API procedure gated on `role === "admin"`.
: Used for content management and analytics on the web admin surface.
`[source: recommendation-engine PRD §3]`

## Surfaces

**Native app** — The primary product surface; where learners practice.
: Carries the gamification, voice rooms, trainer marketplace, and paywall scope that the web
admin does not. `[source: PRODUCT.md surfaces table; apps/native/PRODUCT.md]`

**Web admin** — The operations surface.
: Moderation, user management, content, and subscription administration. It serves the
native app; it never forces it to bend.
`[source: PRODUCT.md surfaces table, principle 2]`

**Trainer** — A paid expert for 1:1 or group classes, distinct from a peer co-learner.
: Trainer talk, class booking, and availability are a separate product line from the match
queue. `[source: prd.md FR-22, addendum.md §H]`

**Live register ("Stage")** — The native app's dark mode for matching, calls, and live rooms.
: Always dark regardless of system theme. A fixed register for live voice, not a light/dark
toggle. `[source: apps/native/DESIGN.md]`

**Pro** — The paid-tier marker on the native surface, in Aurum gold.
: Aurum appears only in Pro contexts: paywalls, membership spotlight, Pro badge.
`[source: apps/native/DESIGN.md]`

**Daily speaking streak** — The retention ritual.
: A daily goal of 10 minutes of calling plus 2 minutes in a room earns +10 stars. Already
shipped in the live app; the rebuild preserves rather than duplicates it.
`[source: addendum.md §H; apps/native/DESIGN.md]`
