# PRD Quality Review — AceFluency Rebuild

## Overall verdict

This is a high-substance, brownfield-aware PRD that earns its place from a real signal source (50+ Play Store complaints) and never strays into "furniture." Decision-readiness is strong — every claim is anchored to a review cluster, every FR has testable consequences, and the counter-metrics actually counter the temptation to game the system. The main risks are (a) refund policy is deferred to addendum but reviews demand it, (b) one Critical concern in scope-honesty around the Premium-gender-filter's "60s honest wait" potentially being a worse experience than the silent bypass it replaces, and (c) downstream usability is weakened because no UJ or FR is anchored to an existing-codebase file path the engineering team can grep for. A senior PM would sign this and route it to architecture; a junior dev might miss the §4.3 FR-8 tension without the decision-log.

## Decision-readiness — strong

Trade-offs are named honestly. §4.4 explicitly says "the fix is not 'remove all enforcement' — it is 'make the enforcement match the actual harm'" instead of softening the moderation question. §4.2 picks a 30s reconnect window with reasoning rather than a generic "good UX." §5 Non-Goals cuts cleanly: video, group calls, AI tutors, B2B are all rejected with one-line reasoning rather than left as "consider for future." Open Questions 1-7 are genuinely open — payment provider, refund specifics, gender-field inclusivity, push notification policy, LiveKit Cloud vs. self-host, match-quality measurement — none have a "trust me" answer in the next sentence.

One small weakness: §4.3 FR-8 says the system "never" returns a violating match and "if no valid match exists within 60 seconds, the user sees an honest 'no matches available' state." This is a decision dressed as a non-decision. The harder question — is the 60s wait + skip-preference a better UX than a faster, slightly-lower-quality match — is the kind of trade-off a reviewer would push back on. The PRD assumes the answer.

### Findings

- **[medium]** §4.3 FR-8 — 60s wait with no partners available is asserted as "honest" but never validated against user behavior. *Fix:* add a metric (SM-?): "% of gender-filter queue timeouts that result in user re-entering queue within 5 min" — if low, the wait is hostile to the user; if high, the wait is doing its job.
- **[low]** §4.4 FR-11 — "30s of audio before end" definition of "short disconnect" is opinionated. *Fix:* open-question it or note in §9 that threshold will be tuned from data.

## Substance over theater — strong

No persona theater — the five UJs (Sumit, Tahiniyath, Vemireddy, Hari, Mridu) each drive a specific FR cluster. Persona count is 5, not "4-7" padding. No vision theater — the Vision section explicitly leans into the unflattering differentiation ("the gym for spoken English") and names the category failure modes the rebuild addresses. No NFR theater — feature-specific NFRs have numbers (400ms p95, 95% reconnect, 2.5s cold-start, 24h/72h SLA). No innovation theater — nothing claims to be novel; the entire pitch is "do the boring things well."

The Differentiator claim in §1 ("wins against apps that promise AI tutors and 30-day fluency") is supported by the rest of the document: features and metrics all align with that positioning. The marketing copy in `about.md` is not echoed verbatim, which is correct — the PRD is not a brochure.

### Findings

- None significant. The PRD is unusually clean of furniture for a launch-stakes rebuild.

## Strategic coherence — strong

The thesis is clear from §1: the category is full of apps that fail at the moment of motivated use, and AceFluency wins by not failing. Every feature in §4 serves that thesis: §4.1 (auth) addresses the login failure mode, §4.2 (calls) addresses the call-drop failure mode, §4.3 (matching) addresses the filter-integrity failure mode, §4.4 (moderation) addresses the punishment failure mode, §4.5 (billing) addresses the trust failure mode, §4.6 (mobile) addresses the stability failure mode. There is no "let me also add…" feature in the FR list.

The SMs validate the thesis, not just activity. SM-1 (disconnect rate), SM-2 (Play Store rating), SM-3 (first-call completion), SM-4 (support response), SM-5 (refund rate) are all *trust* metrics, not growth metrics. Counter-metrics SM-C1 (don't optimize match volume) and SM-C3 (don't optimize conversion) directly defend the thesis against the natural failure mode of "ship the rebuild, then A/B test it back into the failure mode that drove the rebuild." That is unusually well-calibrated for a launch PRD.

MVP scope kind is clearly *problem-solving* (fix the trust failure), not platform, not experience-led, not revenue-led. Out-of-scope items are explained: AI conversation partner is "defer" with a `[NOTE FOR PM]` because review cluster requests it (Raman, Keertika), but the rationale is "this is a rebuild, not a v2."

### Findings

- **[low]** §6.2 — friend list / re-match-with-same-partner is deferred with "conflict with anonymous matching" reasoning, but the same concern does not appear in §1 or anywhere else as a stated design principle. *Fix:* add to Glossary or §1 that matching is intentionally anonymous in v1.
- **[low]** §7 SM-2 — "currently 2.0-3.5 in sampled reviews" is read off the sampled reviews, not the actual store rating. *Fix:* in §9, mark as "sampled" or "to be verified at finalize."

## Done-ness clarity — strong

Every FR has at least one testable consequence with a number, a time bound, or a discrete state. "User-friendly" and "reasonable performance" do not appear. The pattern "Realizes UJ-N" appears consistently, giving downstream story creation an anchor.

FR-1 (persistent session), FR-2 (silent refresh), FR-6 (reconnection), FR-7 (call-end states), FR-11 (graduated strikes), FR-14 (visible subscription), FR-17 (backgrounding) all have specific, measurable consequences. Engineers reading these can write acceptance tests.

### Findings

- **[medium]** §4.5 FR-16 — "First-response SLA: 24 hours for paying users, 72 hours for free users" is asserted as a testable consequence but the test is "did a human respond in 24h?" — which depends on staffing, not code. *Fix:* add a sub-FR or NFR that the system *measures* SLA compliance and exposes it to the team, even if the team itself is offline.
- **[low]** §4.4 FR-13 — "visible moderation state" has a consequence about what the user *sees* but no consequence about the system state itself. *Fix:* add a consequence that moderation state is server-authoritative and the client cannot modify it.

## Scope honesty — adequate

The Non-Goals section is strong. The Assumptions Index (§9) is comprehensive. `[ASSUMPTION]` tags appear 12 times, all indexed.

The weakness is in the *deferred* items. Refund policy is Open Question 2 but appears nowhere in §4 as a sub-FR — yet the entire §4.5 premise is "users get fair treatment at billing time." If the refund policy design falls out, §4.5 is shipping a paywall with no escape hatch. Similarly, LiveKit Cloud vs. self-hosted (Open Question 6) is an infrastructure choice but PRD SM-1 / FR-6 / FR-7 all depend on the answer. The PRD is honest that these are open, but it should mark them as "blockers for SM-1 / SM-5 measurement" so the Finalize pass cannot ship a "trust me" PRD.

### Findings

- **[high]** §4.5 / Open Question 2 — Refund policy is the explicit ask of multiple reviews (Mridu, Ajeet Kumar, Gowtham, Sumit) but has no FR in §4.5; only FR-14/15/16 cover visibility, cancellation grace period, and ticket SLA. *Fix:* add FR-17 (or re-number) "auto-refund eligibility" and "human-review path for gray-area cases" to §4.5 before finalize. Until then, mark Open Question 2 as a "phase-blocker for §4.5 sign-off."
- **[high]** §4.2 / Open Question 6 — LiveKit Cloud vs. self-hosted affects SM-1 measurement (reconnect success rate at 95% p95 is plausible on Cloud, requires explicit network engineering on self-host). *Fix:* mark Open Question 6 as a "phase-blocker for §4.2 NFR sign-off" until architecture picks.
- **[medium]** §4.3 FR-8 — "Never returns a violating match" is asserted as a consequence but in a thin-user-pool market (e.g., 23:00 BST on a Sunday with 2 female users online) the consequence is silent queueing. *Fix:* add to FR-8's consequences that the system logs the *count* of "would have matched" violations per day so the team can see when the filter is starving the user.

## Downstream usability — adequate

Glossary is present and well-built (14 terms). UJ-1..UJ-5 are named with protagonists. FR-1..FR-19 are contiguous and numbered. SM-1..SM-10 + SM-C1..SM-C4 are present and cross-referenced.

The weakness is the absence of any `file:` or `class:` anchor in the FRs themselves. The PRD names features in product terms ("FR-5: Server-managed Call rooms") but does not say "in `packages/api/src/routers/livekit.ts`, add a `createRoom` oRPC procedure." A senior engineer could find the right file from §0 (Document Purpose) which lists existing files. A junior engineer would have to re-read §0 and grep.

For a brownfield PRD that will feed `bmad-create-architecture` immediately downstream, this matters. The architecture workflow will re-derive the file mapping anyway, but pointing to the exact existing file under each FR (where applicable) would make the architecture hand-off more direct.

### Findings

- **[low]** §4.2 FR-5 — "When a Match resolves, the system creates a Room..." — should reference existing `livekit.token` endpoint and the new `roomService.createRoom` server SDK call from `livekit-server-sdk`. *Fix:* add a "(see `packages/api/src/routers/livekit.ts` for token mint, add new `livekit.createRoom` procedure)" inline.
- **[low]** §4.3 — "The user table gains a `gender` field" / "The user table gains a `nativeLanguage` field" — these are schema changes; should reference `packages/db/src/schema/auth.ts` by path. *Fix:* add a one-line `(schema: packages/db/src/schema/auth.ts)` annotation per FR.

## Shape fit — strong

For a consumer product with multi-stakeholder (paying user, support team, engineering), UJs with named protagonists are load-bearing — this PRD has them. For a brownfield rebuild feeding UX → architecture → epics, downstream usability is load-bearing — this PRD is adequate (see above) but not maximal. For launch-stakes, the SM-with-counter-metric discipline is load-bearing — this PRD has it.

The PRD is not over-formalized (no "regulatory compliance" sections for an app that has none), and not under-formalized (no missing §4 features for the launch surface). Mobile-first shape is right for the primary market; web is correctly de-scoped.

### Findings

- None.

## Mechanical notes

- Glossary drift: "Learner" vs "user" — used inconsistently. Mostly "Learner" in §2/§4 but "user" appears in §4.2 "the user" (twice in FR-7) and in §6.1 "user" descriptions. *Fix:* pick one. Glossary says "Learner = A user of AceFluency whose target language is English" — use "Learner" everywhere or accept the synonym and remove the Glossary definition.
- ID continuity: FR-1..FR-19 contiguous, no gaps. UJ-1..UJ-5 contiguous. SM-1..SM-10 + SM-C1..SM-C4 contiguous. Cross-references resolve.
- Assumptions Index roundtrip: 12 inline `[ASSUMPTION]` tags, all 12 indexed in §9. No drift.
- UJ protagonist naming: all 5 UJs have named protagonists (Sumit, Tahiniyath, Vemireddy, Hari, Mridu). Each name appears in the matching review entry in `docs/ratings-and-reviews.md`.
- Required sections present: §0-§9 all present, in order. §5 Non-Goals present (would have been missing on a less rigorous PRD). §6 MVP Scope split into 6.1/6.2. §7 SMs with counter-metrics. §8 Open Questions (7). §9 Assumptions Index.

## Dimension verdicts summary

- Decision-readiness — **strong**
- Substance over theater — **strong**
- Strategic coherence — **strong**
- Done-ness clarity — **strong**
- Scope honesty — **adequate** (2 high findings on deferred items affecting launch-blocking decisions)
- Downstream usability — **adequate** (1 low finding on file-path anchoring)
- Shape fit — **strong**

## Finding counts

- Critical: 0
- High: 2 (refund policy, LiveKit Cloud vs. self-host)
- Medium: 4
- Low: 7
