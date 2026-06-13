# PRD Quality Review — AceFluency Practice-English-with-Peers Rebuild

## Overall verdict

This is a strong PRD. The document earns its length: every feature connects to a named user complaint, the UJs are drawn from real Play Store reviews rather than invented, and the counter-metrics show a PM who understands how incentive misalignment destroys the product they're trying to fix. The main risks are (1) a soft spot in billing/refund scope where the dual-PSP requirement (SSLCommerz + India provider) is acknowledged but structurally unresolved — and §6.1 does not say whether MVP ships to one market or two, (2) a handful of FR consequences where boundary definitions need tightening for an engineer to write acceptance tests (especially FR-20's "critical crash" and FR-11's "short disconnect"), and (3) stale phase-blocker brackets in §6.1 that contradict the resolved status in §0.

---

## Decision-readiness — strong

The PRD is structured for a decision-maker who needs to say "go" or "no-go" on a rebuild. §0 names the phase-blockers and their resolution status. Open Question 6 (LiveKit Cloud vs. self-hosted) is resolved inline with rationale. Open Question 1 (payment provider) is resolved with a named provider and API endpoint. Open Question 2 (refund thresholds) is explicitly *demoted* from phase-blocker with honest reasoning: "the *structure* of FR-20 is the requirement; thresholds are tuning parameters owned by PM + Legal" (§0, line 18). This is proper scope separation.

Trade-offs are surfaced where they matter: the rejected-alternative section in addendum §A (auto-rejoin vs. ICE-restart, silent reconnect vs. UI indicator) shows two paths considered and discarded with reasons. The non-goals in §5 do actual exclusion work — "AI voice tutors," "video calling," "group calls" are all things a stakeholder might reasonably ask for, and each gets a one-line rationale.

### Findings

- **medium** OQ-9 has no resolution path or owner timeline (§8, line 449) — "India PSP unresolved" (§8, line 449) — "Revisit at Finalize before MVP ships India pricing" is vague. The India PSP blocks FR-20 refund execution for roughly half the user base if the app ships to both markets simultaneously. *Fix:* Assign a hard deadline or gate MVP India launch on OQ-9 resolution; add to §6.1 as a conditional scope item.
- **low** OQ-7 (match quality measurement) is marked "PARTIALLY RESOLVED" but the open piece — "exact weighting of rating in the matching score" — is deferred to v2 while affecting SM-6 (match wait time) because quality-weighted matching changes queue dynamics. *Fix:* Add a note in SM-6 that the metric baseline may shift when OQ-7's weighting is implemented.

---

## Substance over theater — strong

The PRD passes the theater test across all four sub-dimensions.

**Persona theater:** Absent. UJ-1 through UJ-5 use real reviewer names (Sumit, Tahiniyath, Vemireddy, Hari, Mridu) drawn from `ratings-and-reviews.md` (§2.3, line 56: "dominant review-cluster personas are real names lifted from `ratings-and-reviews.md`"). Each UJ has an entry state, a numbered path, a climax that names the system failure, and an edge case. These are not decorative — FR-11's entire graduated-strike design exists to close UJ-1's climax ("Sumit pays for premium and gets *locked out*").

**Innovation theater:** Absent. The vision statement (§1, line 36) is deliberately anti-aspirational: "the category is full of apps that promise 'AI tutors' and 'fluency in 30 days' and lose to one that *just keeps the call connected and lets two people finish a sentence.*"

**NFR theater:** Absent. Every NFR is (a) attached to a specific FR, (b) stated with a percentile and a device/network context, and (c) collected into a cross-cutting table in addendum §E with source FRs. The observability requirement at the bottom of §E (line 90: "No NFR is shipped without a measurement path") is the right forcing function.

**Vision theater:** Absent. §1 is three paragraphs. It states the problem, the category position, and the rebuild's reason for being. No mission-statement padding.

### Findings

- **low** The "4 of 5 adults report spoken-English fluency anxiety" claim (§1, line 32) is flagged in §9 as "sourced from `about.md`, not independently verified." Good self-awareness, but the claim anchors the vision. *Fix:* Soften the clause in §1 to "a large majority" or add a verification action to the Assumptions Index entry.

---

## Strategic coherence — strong

The PRD has a clear thesis: **the product loses users because it punishes them for infrastructure failures, and the rebuild's job is to make every failure mode visible, honest, and non-punishing.** Stated in §1 (line 34: "the technology fails the user at the moment the user is most motivated") and every feature group maps to it:

- §4.1 (Auth) → "stop logging users out" → UJ-2
- §4.2 (Call reliability) → "stop dropping calls on blips" → UJ-3
- §4.3 (Matching) → "stop force-matching past filters" → UJ-4
- §4.4 (Moderation) → "stop banning victims" → UJ-1
- §4.5 (Billing) → "stop charging for broken product with no escape" → UJ-5
- §4.6 (Mobile stability) → "stop crashing and losing state" → review cluster

Success metrics validate the thesis. SM-1 (disconnect rate ≤5%) validates call reliability. SM-2 (store rating ≥4.0) validates aggregate trust recovery. SM-5 (refund rate ≤2%) validates billing trust. The counter-metrics are the strongest coherence signal: SM-C1 (line 434: "do not optimize for raw match volume; doing so will push the system to bypass filters — which is the failure UJ-4 is about") directly names the Goodhart's Law failure the current product already exhibits. SM-C3 against conversion rate is similarly well-calibrated.

### Findings

- **medium** No retention or DAU/MAU metric. SM-2 (store rating) is a lagging proxy for trust recovery, but the PRD lacks a leading indicator of whether the rebuild actually brings churned users back or prevents new churn. The thesis is "trust recovery" — there should be a metric that measures trust directly (e.g., D7/D30 retention for users who complete ≥3 calls, or "returning user rate after a disconnect event"). *Fix:* Add one retention-focused SM that measures behavior *after* a failure event (reconnect, strike warning, refund denial) to validate the "honest failure handling" thesis.
- **low** SM-2's baseline ("currently 2.0–3.5 in sampled reviews") is flagged in §9 (line 466) as not the actual store rating. *Fix:* Pull the actual Play Store rating at PRD-ship time and record it as the baseline.

---

## Done-ness clarity — adequate

Most FRs have testable consequences stated in the "[Subject] can [action] [context] [outcome]" format. The consequences are generally concrete: "Killing the app process and re-opening it within 30 days does not require re-auth" (FR-1), "A match is never returned that violates a Learner's stated preference" (FR-8), "A 1s blip results in ≤500ms of audio dropout, no UI change visible to the partner" (FR-6).

The weak spots are in the billing and moderation features, where the PRD correctly identifies thresholds as "tuning parameters" but in doing so leaves some FRs without a testable v1 definition an engineer can implement against.

### Findings

- **high** FR-20 (refund mechanism) consequence line 335: "≥3 critical app crashes in the user's first 7 days" — what counts as a "critical app crash"? The addendum §B (line 33) adds "force-close or black-screen" but this clarification lives in the addendum, not the FR itself. An engineer implementing the crash-count trigger needs to know what telemetry event to count. *Fix:* Add a parenthetical in FR-20's consequence: "critical app crash (force-close or ANR reported by the OS crash-reporting SDK)." Cross-ref addendum §B explicitly, or promote the definition into the FR.
- **high** FR-11 (graduated strikes) uses "short disconnect = <30s of audio before end" (line 265) as the strike trigger. "Audio" is ambiguous: is this 30s of *any* audio (including silence), 30s of *active speech*, or 30s of *call duration* (wall-clock)? For a user matched with a silent partner (UJ-1), the call duration could be 90s but audio content could be 0s. The distinction determines whether Sumit's scenario triggers a strike or not. *Fix:* Define "short disconnect" as call duration <30s (wall-clock time from both participants joining the Room to one disconnecting). Note that silence-detection-based tuning is v2.
- **medium** FR-17 (state preservation across backgrounding) consequence: "Backgrounding during a call does not end the call" (line 358). The FR says "up to 30 minutes" but does not distinguish between "app is backgrounded but alive" and "app was killed by the OS while backgrounded" — a common event on low-RAM Android devices (the primary market). *Fix:* Split the consequence: (a) backgrounded-but-alive: call persists; (b) OS-killed while backgrounded: call ends, user returns to "Call ended — connection lost" state (per FR-18), no strike assessed.
- **medium** FR-3 (phone OTP) consequence: "OTP delivery uses an SMS provider with a fallback to voice call for unreachable numbers" (line 155). "Unreachable" is undefined — after how many failed SMS attempts? What timeout? *Fix:* Add: "If SMS delivery is not confirmed within 60s, offer voice-call fallback."
- **low** FR-4 (Google OAuth) has no failure-mode consequence. What happens if Google auth returns an error? *Fix:* Add: "If Google OAuth fails, the user sees an error message with a 'Try again' button and a fallback to email/password login."

---

## Scope honesty — strong

The PRD is unusually honest about its own boundaries. The mechanisms are well-deployed:

1. **`[ASSUMPTION: ...]` tags** appear inline and are collected in §9 (Assumptions Index, 17 entries). Each entry names the source and confidence level. Example: "§5: 90%+ of active users on mobile is an inference from the review source, not measured" (line 465).

2. **`[NOTE FOR PM: ...]` callouts** appear where tuning decisions are deferred: FR-11 (line 263: "1h vs. 2h, 24h vs. 48h are tuning parameters; current 48h ban is exactly the failure mode UJ-1 describes, so the new ceiling must be visibly shorter").

3. **Non-Goals** (§5) do real exclusion work. Eight items, each with a one-line rationale referencing the target user or market conditions.

4. **Out of Scope** tags appear per-FR (FR-1: "Biometric unlock (deferred to v2)"; FR-3: "WhatsApp OTP (deferred)"; FR-20: "Partial refunds, proration logic, refund for a free trial. Deferred to v2").

5. **Phase-blockers** are listed in §0 with resolution status and strikethrough formatting.

The one area of genuine scope ambiguity is material enough to flag:

### Findings

- **high** The dual-market scope (Bangladesh + India) is acknowledged in §4.5 (line 294) and OQ-9 (line 449), but §6.1 (MVP Scope) does not say whether MVP ships to both markets or BD-only. If BD-only, the India PSP is not a blocker. If both, OQ-9 is a phase-blocker that is not listed as one. This could cause a team to build SSLCommerz integration and then discover they also need Razorpay before launch. *Fix:* Add a "Market scope" line to §6.1: "MVP ships to [BD only / BD + IN]. If BD + IN, OQ-9 (India PSP) is a phase-blocker."
- **medium** The existing app has features not addressed by the rebuild (Voice Clubs, AI Speaking Test, Recorded Courses, Tutor Marketplace — listed in addendum §H, line 176: "The rebuild does *not* redesign them"). But the PRD does not state whether these features *continue to work unchanged* in the rebuilt app or are *temporarily removed*. An engineer needs to know: does the rebuild ship with the same 5-tab navigation? *Fix:* Add a "Preserve-as-is" section to §5 or §6 listing existing features that ship unchanged.
- **low** §4.3 description (line 216) honestly acknowledges the "no partners online, waiting 20+ minutes" failure mode but this acknowledgment is buried in §4.3's description, not in §5 (Non-Goals) or §6.2 (Out of Scope for MVP) where a scope reviewer would look. *Fix:* Add a line to §6.2.

---

## Downstream usability — strong

The PRD is well-structured for handoff to `bmad-ux`, `bmad-create-architecture`, and `bmad-create-epics-and-stories`.

**Glossary (§3):** 19 terms, all used consistently in the document. Terms like "Strike," "Cooldown," "Moderation State," and "Reconnection" have precise definitions that match their FR usage.

**IDs:** FR-1 through FR-20 are globally numbered and unique. SM-1 through SM-10 plus SM-C1 through SM-C4 are contiguous. UJ-1 through UJ-5 are contiguous.

**Cross-refs:** FRs reference UJs ("Realizes UJ-2, UJ-3"), SMs reference FRs ("Validates FR-6, FR-7"), and the addendum sections reference back to the PRD ("detail backing §4.2 FR-6"). Addendum §F (Existing-Code Anchors) maps PRD constructs to file paths — unusually good for architecture handoff.

**UJ protagonists:** All five UJs have named protagonists with context (language, gender, tier, level). UJ-3's Vemireddy includes the network condition ("commutes on a train… moves between cellular towers").

### Findings

- **medium** FR numbering is non-sequential in document order: FR-14, FR-15, FR-16, FR-20 appear in §4.5, then FR-17, FR-18, FR-19 in §4.6. FR-20 appears *before* FR-17. While IDs are unique, an engineer scanning by number will mis-locate FRs. *Fix:* Add a FR index table to §4 or §0, or renumber so document order matches ID order.
- **low** Glossary does not define "Skip" — used as a first-class in-call action in FR-11 (line 266) and called "the load-bearing piece" in addendum §C (line 54). It is implicitly defined in FR-11 but deserves a glossary entry since it is a new interaction primitive that does not exist in the current app. *Fix:* Add to §3: "**Skip** — An in-call action that ends the current call and returns the Learner to the match queue without counting as a strike."
- **low** Glossary defines "Pronunciation Score" (line 116) but the term appears nowhere else in the PRD body. It is an orphan entry. *Fix:* Either remove from glossary or add a note in §6.2 that pronunciation scoring is preserved as-is from the existing app.

---

## Shape fit — strong

The PRD is a rebuild spec for a live product with known failures, and its shape matches that purpose. It is not a greenfield discovery document (no "jobs interview" padding), not a technical design doc (no sequence diagrams), and not a marketing brief (no GTM section). The shape choices that work:

- **UJs drawn from complaints, not personas:** The right shape for a rebuild driven by user pain.
- **Feature groups organized by failure domain, not by screen:** §4.1 is "Auth & Session Reliability," not "Login Screen." This lets the architecture team cut across screens.
- **Addendum as overflow, not appendix:** The addendum holds rejected alternatives (§A), tuning matrices (§B, §C), deferred inputs (§D), cross-cutting NFRs (§E), code anchors (§F), OQ routing (§G), and screenshot-derived surface map (§H). None of this is filler; each section is referenced from the main PRD.
- **Screenshot-derived surface map (§H):** Added to ground the rebuild in the *actual* app. This is the right shape for a team that might not all have the app installed.

### Findings

- **low** The PRD does not include a dependency graph or build-order suggestion among the 6 feature groups. For a rebuild with 20 FRs, the architecture and epics workflows would benefit from knowing which FRs are foundational (e.g., FR-1/FR-2 auth must ship before FR-5 rooms can be tested). *Fix:* Add a brief "Build order constraints" note to §6.1 or defer explicitly to the architecture workflow.

---

## Mechanical notes

- **Glossary drift:** "Skip" is used as a defined concept in FR-11 (line 266) and addendum §C (line 54) but is absent from the §3 glossary. "Pronunciation Score" is in the glossary but unused in the PRD body (orphan).
- **ID continuity:** FR-1 through FR-20 are unique but not sequential in document order (FR-20 in §4.5 before FR-17..FR-19 in §4.6). SM-1..SM-10 and SM-C1..SM-C4 are contiguous and sequential. UJ-1..UJ-5 are contiguous.
- **Cross-ref integrity:** All FR→UJ references resolve. All SM→FR references resolve. Addendum §A→FR-6, §B→FR-20, §C→FR-11, §E→source FRs, §F→file paths all resolve. §6.1's OQ references resolve to §8. No broken cross-refs found in the main document.
- **Addendum §H cross-ref typo:** Line 168 references "FR-3 (gender filter)" but FR-3 is phone-number auth; FR-8 is the gender filter. Line 169 then correctly references FR-8. The FR-3 reference on line 168 is a typo. *Fix:* Change addendum §H line 168 from "FR-3" to "FR-8."
- **Stale phase-blocker brackets in §6.1:** §0 marks OQ-6 as resolved with strikethrough. §6.1 line 395 still reads "[Phase-blocker: Open Question 6 must resolve before FR-6/SM-1 ship values are confirmed]" — should be updated to "[Resolved]" or removed. Similarly, §6.1 line 398 marks OQ-2 as a phase-blocker, but §0 line 18 demoted it from phase-blocker status. *Fix:* Update §6.1 brackets to match §0 resolution status.
- **Assumptions Index roundtrip:** §9 has 17 entries. Spot-checked 5: §1 anxiety claim → resolves to line 32; §4.4 FR-11 Skip dependency → resolves to line 266; §5 mobile assumption → resolves to line 387; §7 SM-2 baseline → resolves to line 419; §4.5 FR-16 SLA → resolves to line 321. All roundtrip correctly.
- **UJ protagonist naming:** All five UJs have named protagonists (Sumit, Tahiniyath, Vemireddy, Hari, Mridu) with language, gender, tier, and context. All names trace to `ratings-and-reviews.md` per §2.3 line 56.
- **Auth NFR source FR mismatch:** Addendum §E (lines 80–81) attributes auth NFRs to "FR-1" but the auth failure-rate NFR (≥99% first attempt) is stated under FR-4's feature-specific NFRs in the PRD (line 169). *Fix:* Update §E source column to "FR-4" for the auth NFRs, or note that the NFR applies across §4.1.
