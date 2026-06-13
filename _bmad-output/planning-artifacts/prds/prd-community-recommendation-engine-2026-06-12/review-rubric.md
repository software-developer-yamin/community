# PRD Quality Review — AceFluency Personalized Content Recommendation Engine

## Overall verdict

This is a genuinely strong companion PRD — one of the better reverse-engineered-from-code specs I've seen. It earns its length: the feature inventory is code-validated, gaps are called out with FR numbers and priority/effort, the scoring algorithm is specified to testable precision, and the success metrics actually measure the thesis. The main weaknesses are a thin decision log that doesn't capture the trade-offs *within* the PRD (weight choices, filter widths, TTL), a few pockets of specification vagueness in the gap FRs, and some mechanical numbering issues. Nothing is broken; several things could be tightened.

---

## Decision-readiness — strong

The PRD is structured so a PM or engineering lead can act on it immediately. §6 MVP Scope splits cleanly into "already implemented" (§6.1), "must complete before MVP done" (§6.2 gap table with priority, effort, and blocker status), and "v2 roadmap" (§6.3). The gap table at §6.2 is the strongest element — it names five specific gaps, maps each to an FR, assigns priority and t-shirt effort, and flags whether each is a blocker. An engineer reading §6.2 knows exactly what to build next.

Trade-offs are surfaced honestly in several places: §4.3 FR-9 documents the "exclude all interacted content" choice and §10 immediately flags the assumption that this may over-exclude bookmarked content. The scoring weights (0.4/0.3/0.2/0.1) are presented as starting values with an explicit assumption tag (§10, bullet 4). Open Questions are genuine — OQ-2 (sync vs async embedding), OQ-3 (TTL tuning), OQ-4 (mobile design decisions) are real unresolved decisions with named owners.

### Findings

- **minor** Decision log is vestigial (§.decision-log.md) — The log has a single entry from 2026-06-12 recording the feature selection decision. None of the intra-PRD trade-offs (weight choices, filter width, TTL value, exclusion policy) are logged. The log doesn't earn its existence. *Fix:* Add entries for the major design choices surfaced in §9 and §10, or remove the log and fold the feature-selection rationale into §0.
- **minor** OQ-6 proposes specific interaction weights ("like = +0.3, dismiss = -0.2, complete = +0.1, bookmark = +0.2") but labels them "proposed starting values" without stating who proposed them or what evidence supports them. *Fix:* Either cite the source (PM intuition, competitor analysis, literature) or reframe as "placeholder values to be validated."

---

## Substance over theater — strong

The PRD earns its content. Key indicators:

**Personas are functional, not decorative.** Rina (§2.1) drives real design decisions: her "5–10 minute windows" constraint motivates short-form content, her "travel and food" interests appear in the scoring algorithm example (§4.3 FR-8), and her "doesn't want to see the same video" need maps directly to the exclusion filter (FR-9). Arif (§2.2) exists to force the cold-start design question. Yamin (§2.3) is the actual admin. None of these are theater — each persona creates a testable requirement.

**The scoring algorithm is fully specified.** §4.3 FR-8 gives exact weights, exact formulas (`1 - (|content_cefr - user_cefr| / 3)`), and exact edge-case behavior ("A learner with no embedding still gets CEFR-based + tag-based + type-based scoring (60% of the total weight)"). This is specification, not hand-waving.

**NFRs are scoped to specific features, not global boilerplate.** The two NFR blocks (§4.3 FR-11: feed load p95 ≤ 2s; §4.8 FR-23: mobile feed p95 ≤ 1.5s, interaction ≤ 300ms) are attached to the features they constrain, with specific targets. There is no "the system shall be performant" theater.

**Non-Goals do real exclusion work.** §5 explicitly names collaborative filtering, trending, real-time scoring, content moderation, multi-language, content authoring, and A/B testing as out of scope — each with a reason. The native mobile non-goal entry is particularly honest: it starts by noting the `scoreType` enum already includes `"collaborative"` and `"trending"` to prevent engineers from assuming those are implemented.

### Findings

- **nitpick** The Vision (§1) uses the "gym without a training program" metaphor, which is fine, but then repeats the metaphor's implication ("The recommendation engine closes the loop") without adding new information. Two sentences could be one. *Fix:* Trim the second paragraph's final sentence.
- **minor** §2.4 Jobs To Be Done has three bullets that largely restate what §2.1–§2.3 already established. They don't add a new frame (no "when I... I want to... so that I can..." structure or competing alternatives). *Fix:* Either use proper JTBD syntax with context-switching triggers and competing solutions, or cut §2.4 and let the personas carry the load.

---

## Strategic coherence — strong

The PRD has a clear thesis: **the recommendation engine is the "training program" that makes peer voice practice more effective by filling between-session time with level-appropriate content.** This thesis is stated in §1 and validated throughout:

- Features serve the thesis: hybrid scoring (FR-8) combines CEFR level with semantic affinity to find "the right content at the right difficulty" (§1). The CEFR ±1 filter (FR-9) enforces difficulty appropriateness. Preferences (FR-15–16) capture learner interests so recommendations aren't generic.
- Success metrics validate the thesis: SM-R1 (engagement rate) measures whether learners actually use the feed. SM-R3 (dismiss rate) measures matching quality. SM-R4 (like-to-view ratio) measures content relevance. SM-R6 (preference completion) measures whether the personalization inputs are populated.
- Counter-metrics exist and are thoughtful: SM-RC1 (feed homogeneity) catches the failure mode where CEFR dominates and everyone at B1 sees the same feed. SM-RC2 (CEFR level lock-in) catches the failure mode where the ±1 filter prevents stretch content.

The relationship to the parent PRD is well-articulated (§1 final paragraph, §8.4 shared infrastructure table). The recommendation engine and partner matching share the profile embedding pipeline, CEFR placement, and BGE model — this isn't two separate systems, it's one user model serving two surfaces.

### Findings

- **minor** No success metric directly measures the thesis claim that recommendation-fed learners have *better voice practice outcomes* than those who don't use the recommendation feed. SM-R1–R4 measure recommendation engagement, but the strategic claim is that recommendations improve the *core product* (voice practice). *Fix:* Add a stretch metric: "Correlation between recommendation feed engagement and voice practice frequency / quality scores. Hypothesis: users who interact with ≥3 recommended items per week have ≥15% higher call completion rates." Even if unmeasurable at MVP, stating it anchors the thesis.
- **nitpick** SM-R2 (content coverage ≥ 60%) includes a counter-metric inline ("if coverage is 100%, filtering may be too loose") — good — but SM-R7 (admin content creation ≥ 5/week) has no counter-metric. What if content velocity is high but quality is low? *Fix:* Add a note: "Monitor in conjunction with SM-R3 (dismiss rate) — if creation rate is high but dismiss rate rises, quality gating may be needed."

---

## Done-ness clarity — strong

The implemented FRs (FR-1–3, FR-8–13, FR-15–16, FR-18–20, FR-22) have "Consequences (testable)" blocks that an engineer could translate directly into integration tests. Examples of strong testable consequences:

- FR-1: "title (1–200 chars), description (1–2000 chars), type enum..." — exact validation rules.
- FR-8: "Scores are deterministic for the same inputs — no randomness in the algorithm."
- FR-9: "Candidate pool is capped at 200 items before scoring (performance guard)."
- FR-10: "Scores are stored in `recommendation_score` with `expiresAt = now + 24h`."
- FR-12: "Interactions are upserted on `(userId, contentId, action)` — a user can only have one interaction of each type per content item."

The gap FRs are less precisely specified, which is appropriate for unbuilt features but creates some risk.

### Findings

- **moderate** FR-23 (native mobile feed) lists testable consequences but doesn't specify error states: what happens if the API call fails? What happens if the user has no CEFR placement yet? The web feed (FR-11) also omits error states, but FR-23 is the higher-risk gap because mobile network conditions are less reliable. *Fix:* Add consequences for: (a) network failure → cached/offline state or error message, (b) no CEFR placement → CEFR-less scoring path or onboarding redirect, (c) empty candidate pool → empty state with action prompt.
- **minor** FR-4 (update content item) and FR-5 (bulk import) have no "Consequences (testable)" blocks — they have only a description and priority. When an engineer picks up FR-4, they'll need to know: which fields are updatable? Is `type` updatable? Does changing `cefr_level` invalidate cached scores? *Fix:* Add skeleton consequence blocks for gap FRs, even if marked "[to be refined during story creation]."
- **minor** FR-6's consequence says "flagged as 'embedding pending'" but no schema field supports this flag. The `content_embedding` table either has an embedding or doesn't (the row may not exist). *Fix:* Clarify: does "embedding pending" mean "no row in `content_embedding`" or does it require a status column? Specify which.
- **nitpick** FR-11: "Skeleton loading states display during fetch" — "skeleton" is an implementation pattern, not a testable consequence. *Fix:* Reframe as: "A loading indicator is visible from fetch start until data renders; the page does not flash empty content."

---

## Scope honesty — strong

This is the PRD's best dimension. The reverse-engineering approach forces honesty: every feature is tagged with an implementation status (✅ Implemented, ⚠️ Partial, ❌ Not implemented). The gap FRs (FR-4, FR-5, FR-6 partial, FR-7, FR-14, FR-17, FR-21, FR-23) are called out inline with their parent features, not hidden in an appendix. §6.2's gap table is a model of scope honesty — it ranks gaps by priority, estimates effort, and flags blockers.

The Assumptions Index (§10) is genuinely useful: 11 tagged assumptions, each tied to a specific section, several with "[ASSUMPTION: not validated]" honesty. The final entry (§10, §8.4 note about hardcoded profile template values) is particularly valuable — it surfaces a code-level bug that degrades both recommendation and partner matching quality.

### Findings

- **moderate** §4.6 jumps from FR-20 to FR-21. §4.8 uses FR-23. FR-22 appears in §4.7, which is numbered *after* §4.8 in the document. The section ordering is 4.1–4.6, 4.8, 4.7 — §4.7 and §4.8 are swapped. This creates confusion about whether FR-22 or FR-23 was added later and whether the gap table in §6 is complete. *Fix:* Reorder sections to 4.1–4.7 (seed), 4.8 (mobile feed), or renumber § and FR IDs to be contiguous.
- **minor** The Non-Goals (§5) entry for "Native mobile recommendation feed" is confusing: it starts as a non-goal, then says it's actually MVP-required, then says what *is* a non-goal is admin parity on mobile. This is the right information but it reads as the PRD arguing with itself. *Fix:* Remove the native feed from Non-Goals entirely (it's in §4.8 as an FR) and add a separate Non-Goal: "Admin tools on mobile — admin panel remains web-only for MVP."
- **nitpick** §10 assumption about "Rina-style usage is the primary use case" (bullet 2) notes content consumption "may become primary for some users" — this is a genuine risk to the thesis but is buried in assumptions rather than surfaced as an Open Question. *Fix:* Promote to OQ-9: "If content consumption becomes the primary activity for a segment, does the recommendation engine need different success metrics (e.g., time-on-content, completion rate) than those designed for 'between-session' supplementary use?"

---

## Downstream usability — strong

**Glossary (§3):** Present and functional. Eight terms defined with schema table references. Covers the key domain concepts (Content Item, Content Embedding, Hybrid Score, CEFR ±1 Filter, Profile Embedding, Admin Procedure). Each definition is precise enough that a new engineer can read the PRD without external context.

**Cross-references:** §0 references the parent PRD by ID (`prd-community-2026-06-09`). §1 references parent PRD §4.3 and §5. §8.4 has a shared infrastructure table. FRs cross-reference each other (FR-7 → FR-4, FR-17 → FR-8 signals 3 and 4). Success metrics cross-reference FRs (SM-R1 → FR-8, FR-11; SM-R6 → FR-16, FR-17).

**Codebase references (§0):** Five specific file paths with descriptions. An engineer can go from PRD to code immediately.

**User journeys:** Personas have names (Rina, Arif, Yamin) and are referenced by name in §2 but not elsewhere in the PRD. The FRs use role labels ([Admin], [Learner], [System], [Developer]) rather than persona names.

### Findings

- **minor** The Glossary omits "CEFR" itself. The PRD uses CEFR extensively and assumes the reader knows it means Common European Framework of Reference for Languages. For a downstream consumer (designer, QA) who may not know CEFR, this is a gap. *Fix:* Add a glossary entry: "CEFR — Common European Framework of Reference for Languages. Six levels: A1 (beginner) through C2 (proficient). Used as the primary difficulty axis for both content and learner assessment."
- **minor** FR IDs are not contiguous: FR-1 through FR-22 exist, then FR-23-is in §4.8 which appears *before* §4.7 (FR-22) in document order. This means reading top-to-bottom, you encounter FR-23 before FR-22. *Fix:* Renumber so document order = FR number order, or reorder sections (see Scope honesty finding above).
- **nitpick** User journeys are implicit in the personas but not spelled out as flows. Rina's journey ("opens app → sees feed → taps card → watches video → likes it → next session the feed is updated") is inferable but never written. For a UX designer picking this up, an explicit 3-step journey map per persona would accelerate wireframing. *Fix:* Add a "§2.5 Key User Flows" subsection with 2–3 numbered flows.

---

## Shape fit — strong

This is explicitly a brownfield companion PRD reverse-engineered from code (§0: "This document codifies *what was built*, *why it exists*, *what's missing*, and *what 'done' looks like*"). The shape is appropriate for this origin:

- **Implementation status tags** (✅/⚠️/❌) on every feature section — correct for a reverse-engineered doc.
- **Code-validated architecture** (§8) with actual table schemas, API surface, and scoring pipeline — correct for documenting existing code.
- **Gap FRs inline** with implemented FRs rather than in a separate "future" section — correct because the gaps are holes in an existing system, not new features.
- **Codebase references** in §0 with file paths — correct for a companion doc that should be read alongside code.
- **Parent PRD relationship** clearly stated with shared infrastructure table — correct for a companion PRD.

### Findings

- **minor** The decision log (`.decision-log.md`) has only one entry about the initial feature selection. For a reverse-engineered PRD, the decision log should capture *why the existing implementation made the choices it did* — e.g., why 384-dim BGE-small-en instead of a larger model, why CEFR ±1 instead of ±2, why 24h TTL. These decisions were made by the original implementers and are worth recording. *Fix:* Interview the implementation record (git blame, commit messages, code comments) and backfill 3–5 key implementation decisions.
- **nitpick** §8.1 Data Model uses a custom text diagram format rather than a standard notation (Mermaid ERD, DBML). For downstream consumers using tools that parse Mermaid, a dual representation would help. *Fix:* Add a Mermaid ERD below the text diagram, or note that the text format is canonical and Mermaid is deferred.

---

## Mechanical notes

- §4.7 and §4.8 are out of order in the document — §4.8 (Native Mobile, FR-23) appears before §4.7 (Seed & Demo, FR-22). This breaks both section numbering and FR numbering expectations.
- FR-4 appears in §6.2 (MVP gaps) *and* §6.3 (v2 roadmap) — "Update content item endpoint" is listed in both tables with Medium priority. This is contradictory: is it MVP or v2? The §6.2 entry says "No — workaround exists" for blocker, suggesting it's not MVP-blocking, but its presence in 6.2 implies it's MVP-scoped. *Fix:* Remove FR-4 from §6.3 or explicitly note the overlap.
- The `createContent` endpoint in §8.2 is listed as "Protected" (authenticated user), but §4.1 FR-1 says "[Admin] can create." If any authenticated user can create content, that's a security concern; if only admins can, the API table should say "Admin" not "Protected." *Fix:* Verify against code — `createContent` in the router likely uses `protectedProcedure` not `adminProcedure`. If so, flag as a gap: content creation should be admin-gated.
- §4.3 FR-8 signal 4 says "Binary — 0.1 if the content type matches" but the weight is 10%, so the actual contribution is 0.1 × 1.0 = 0.1 or 0.1 × 0.0 = 0.0. The word "Binary" is misleading since the signal value is 1.0 or 0.0 (the 0.1 is the weight, not the signal). *Fix:* Reword: "Binary signal (1.0 if match, 0.0 otherwise) × 0.1 weight."
- Frontmatter says `updated: 2026-06-13` but no changelog or revision history explains what changed between 06-12 and 06-13.
- No addendum.md exists — confirmed absent. This is fine; the PRD is self-contained.
