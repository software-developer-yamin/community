# Adversarial Review — AceFluency Rebuild PRD

## Verdict

Ship-blocker on refund policy. Ship-blocker on LiveKit Cloud assumption. The rest is fixable in one pass.

## Findings

### Critical

- **[critical]** §4.5 / Open Question 2 — Refund policy absent as FR. Multiple reviews (Mridu, Ajeet Kumar, preetam pawar, Sumit) explicitly demand auto-refund for non-working product. §4.5 has 3 FRs (visibility, cancellation grace, ticket SLA) — none cover the actual refund mechanism. Shipping this means paying users still cannot get their money back. *Fix:* add FR-17: "Auto-refund eligibility" + FR-18: "Human-refund path" to §4.5. Define trigger conditions (e.g., 3+ crashes in 7 days = auto-refund) and human-review SLA (7 days). Mark Open Question 2 as phase-blocker for §4.5 sign-off.

- **[critical]** §4.2 / Open Question 6 — LiveKit Cloud vs. self-hosted is undecided but FR-6/FR-7 reconnect NFRs and SM-1/SM-8 are stated as if Cloud is the assumption. On self-hosted LiveKit (no global mesh, single-server-per-room), the 95% reconnect-on-1s-blip claim is much harder to hit for a Bangladeshi user on a 4G network that just roamed to India. *Fix:* mark Open Question 6 as phase-blocker for §4.2. If architecture picks self-host, FR-6 consequences need to be re-stated with the actual reconnect topology.

### High

- **[high]** §4.4 FR-11 — "Skip" button is the proposed solution to the disconnect-strike problem, but the existing code has no Skip affordance. The whole graduated-strike system depends on a UX surface (Skip) that does not exist. *Fix:* add a FR or note that FR-11 consequence depends on a new in-call Skip button, owned by UX.

- **[high]** §4.3 FR-8 — "Never returns a violating match" with "if no match in 60s, see honest 'no matches available'" is a strict policy that may produce a worse experience than the current "silently bypass and let user disconnect." If the female-pool is empty for hours in a given market, the male premium user sees a perpetual "no matches" loop. *Fix:* add a fallback (e.g., "after 5 min of no match, offer to drop the filter and accept any partner, with a clear UX") to FR-8. This is what the rebuild is *for*.

- **[high]** §4.5 FR-16 — SLA (24h paying, 72h free) is asserted but the PRD does not say how the SLA is met if the support team is offline. The current implementation appears to be 2 phone numbers + 1 email address with no SLA. *Fix:* add a dependency: "FR-16 is contingent on the team committing to a support rota, or on an AI-assisted tier-1 response." Mark this as an organizational dependency, not just a code FR.

### Medium

- **[medium]** §4.1 FR-1/FR-2 — "Session stored in `expo-secure-store`" and "refresh token rotated" are implementation details in a requirements doc. They will date fast. *Fix:* move to addendum or just say "secure storage per platform best practice" + "rolling refresh token with rotation" in the FR body.

- **[medium]** §4.1 FR-3 — "OTP delivery uses an SMS provider with a fallback to voice call" presumes a specific provider architecture. Multiple SMS providers in BD/IN markets have deliverability issues; voice fallback is not always available. *Fix:* Open Question 8: SMS provider selection and deliverability expectations. Add as phase-blocker if MVP launch is BD-only.

- **[medium]** §4.2 Feature-specific NFRs — "audio round-trip p95 ≤ 400ms on a 4G connection with 200ms jitter" — the 200ms jitter number is for a specific network condition. BD mobile networks are 100-500ms jitter routinely. *Fix:* re-state as "p95 ≤ 400ms at 200ms jitter; p99 ≤ 700ms at 400ms jitter" or pick a single representative number with explicit network assumption.

- **[medium]** §4.4 FR-11 — "1-hour cooldown" and "24-hour cooldown" are tier values without justification. Why 1h vs 2h? Why 24h vs 48h? The current behavior (48h ban) is what users are complaining about; if the new 24h is close, the complaint cluster may not move much. *Fix:* open-question the cooldown durations, or cite the tuning rationale.

- **[medium]** §4.6 FR-17 — "Backgrounding for up to 30 minutes" — what happens to the LiveKit Room while the app is backgrounded on iOS? On Android? The PRD assumes a 30-min backgrounding preserves call state, but LiveKit on iOS has aggressive microphone suspension. *Fix:* add a consequence: "iOS app backgrounded for >60s may need to request microphone re-activation; user-visible reconnection state shown."

- **[medium]** §7 SM-2 — "App-store rating ≥ 4.0" as a target depends on the existing install base voting, not just new installs. A 4.0 target on a product that currently has 2-3 star ratings means many new 5-star reviews are needed to dilute the historical ones. *Fix:* add a separate metric: "monthly new-review average ≥ 4.2" to capture the rebuild effect independent of the legacy tail.

### Low

- **[low]** §1 — "Join millions of users" claim from `about.md` is restated as the implied scale target. If the actual user count is much smaller, the SM targets may be miscalibrated. *Fix:* verify user count at finalize.

- **[low]** §4.1 FR-3 — "Phone OTP works for new sign-ups and existing email users can link a phone to their account without losing data" — the "without losing data" part is load-bearing. *Fix:* explicit consequence: "Linking a phone to an existing account does not reset the user's subscription, history, matches, or moderation state."

- **[low]** §4.5 FR-14 — "Total billed to date" — this is GDPR/PCI-sensitive in some markets. *Fix:* add to Glossary: which billing fields are user-visible vs. internal.

- **[low]** §5 — "B2B / corporate / reseller / institutional licensing" listed as non-goal but no `feature flag` is mentioned to prevent accidental B2B creep (e.g., a sales team asking for SSO). *Fix:* add a note that any SSO/SAML/JIT request must be routed to a separate v2 PRD, not slipped into this rebuild.

## Top 5 to address before finalize

1. Refund policy as FR (critical)
2. LiveKit Cloud vs. self-host decision marked as phase-blocker (critical)
3. Skip button as a dependency for FR-11 (high)
4. Gender-filter honest-wait fallback for empty-pool markets (high)
5. Support SLA is an organizational dependency, not just a code FR (high)
