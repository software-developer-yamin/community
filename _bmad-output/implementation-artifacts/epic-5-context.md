# Epic 5 Context: Billing, Support & Refund Transparency

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Learners can see exactly what they are paying for, when the next charge lands, and how to stop it without losing paid access. They can raise an in-app support ticket and get a trackable ticket ID with an SLA-bound first response. When the product genuinely does not work for them, they can request a refund and receive an immediate, in-app decision produced by a fixed three-path rule rather than silence. This epic exists because the incumbent app's billing and support surfaces produced a real cluster of one-star reviews from paying users who could not get either an answer or their money back.

## Stories

- Story 5.1: Visible Subscription State
- Story 5.2: In-App Support Ticket
- Story 5.3: Refund Mechanism

## Requirements & Constraints

**Refund decision rule.** Every refund request is classified into exactly one of three paths, and the outcome is always shown in-app (no silent no, no email-only handling).

- Auto-approve, settled within 24 hours, for the full charge: at least 3 critical crashes (force close, ANR, black screen) within the first 7 days after charge; never completing a single call within the first 14 days; or a reported login failure lasting more than 72 hours while a support ticket is open.
- Auto-deny with a plain-language reason plus an appeal route into human review.
- Human review with a 7-day decision SLA for every gray-area case.

**Auto-deny threshold is an AND rule.** Auto-deny only when the account has more than 5 completed sessions AND the request arrives more than 14 days after the charge. Either condition on its own routes to human review. The PRD and its threshold addendum originally contradicted each other on this threshold (one said more than 5 sessions, the other said 1 or more); the AND rule supersedes both. It was adopted on 2026-10-11 and is recorded authoritatively in the story 5.3 decision record.

**Auto-approve wins on conflict.** Classification evaluates auto-approve first. A heavy user who still hits the crash threshold in week one is refunded rather than denied.

**Retry policy.** When the payment provider errors, the system retries up to 3 times over 24 hours. On exhaustion the request falls through to human review rather than failing. The user-facing message throughout is "Refund approved, processing with your payment provider," so a provider outage never converts an auto-approve into a silent 7-day wait.

**Cancellation is not a refund.** Turning off auto-renew preserves paid access until the paid period ends and does not trigger a refund path. The user is shown an explicit "Your plan is paid until [date]" confirmation.

**Paid-state propagation.** Purchase, renewal, cancellation, and refund changes reach the app within 60 seconds.

**Support.** In-app submission returns a ticket ID and an estimated first-response time. First-response SLA is 24 hours for paying users and 72 hours for free users, and SLA compliance is measured internally (open to first human response) so the metric reports on responsiveness rather than staffing. Ticket status and response history are visible to the user.

**Out of scope.** Partial refunds, proration logic, and refunds on free trials are all deferred to a later version. Refund amounts are full-charge only.

## Technical Decisions

- **One gateway resolved, one still open.** SSLCommerz is the Bangladesh gateway. The India market needs a parallel provider that has not been selected yet, so the three-path refund rule stays provider-agnostic and refund execution sits behind an adapter rather than being wired to one vendor's semantics. Refunds in this epic are BDT only.
- **Classify, then execute.** The decision logic reads crash telemetry, subscription state, the source charge, and completed-session counts, and returns the path, status, reason, and SLA deadline. Provider execution is a separate step that consumes that decision. This keeps the whole threshold matrix unit-testable without a gateway or a database, and it guarantees provider failure cannot rewrite the classification.
- **Idempotent execution under retry.** Payment state consistency across retries is a named architectural concern, and the 3-attempts-over-24-hours policy makes idempotency load-bearing rather than defensive. The gateway's dedup key for a refund must be stable across every attempt of the same request.
- **Amounts are integers in smallest units internally.** Currency amounts are stored and passed through the API as integer minor units (a 399.00 charge is `39900`). Any provider-facing decimal form is produced by converting at the adapter boundary, never by changing internal representation.
- **Provider vocabulary stays at the boundary.** Refund status is a local state machine with a fixed status set. Gateway status strings are mapped explicitly on the way in and never written to the database unmapped.
- **Paid-state propagation uses a hybrid.** Webhooks for the push path plus polling, to hold the 60-second budget.

## UX & Interaction Patterns

Money and support copy is deliberately calm. The product is not gamified, and there are no celebratory toasts for refunds. Tone is plain language, never a corporate refusal.

- **Subscription detail.** Plan name, price, next billing date, auto-renew toggle, payment method last 4, and total billed to date. The auto-renew toggle edits immediately with no save button. Cancellation confirmation tells the user they keep access until the paid-until date.
- **Refund flow.** Reached from Subscription, in-app, showing purchase history. The three-path outcome is always surfaced: auto-approve shows "Refund approved. Processing with your payment provider." Auto-deny shows the reason plus an appeal route with the 7-day human-review window. Human review shows "We're reviewing your request. A decision will be made within 7 days." Background refund work surfaces as a toast.
- **Support ticket form.** Category picker, description, optional screenshot attachment. Submission returns ticket ID and SLA estimate. The form scrolls and the keyboard must not obscure the submit button. Buttons disable during submission rather than disappearing.
- **Surfaces.** The native app is the hero surface; the web app carries parity for auth, billing, refunds, and account management. Web notifications are browser-based, not push. The refund decision and status stay reachable from the ticket list so a user is never left wondering.

## Cross-Story Dependencies

- **Subscription state and charges** (5.1) supply the charge date, tier, and subscription status the refund classifier reads.
- **Support tickets** (5.2) gate one auto-approve trigger: the login-failure path requires an open ticket ID. Refund denials also route appeals back into the ticket thread, so a refund decision must create or update a ticket rather than live only on the refund record.
- **Cancellation semantics** (5.1) determine that a refunded subscription keeps paid access until the period end and flips subscription status only afterward.
- **Crash telemetry** from the native app feeds the crash-based auto-approve trigger; without a writer for that telemetry the threshold can never fire.
- **Completed-session counts** come from the call and match domain, so the classifier depends on that data being queryable per user within a date window.