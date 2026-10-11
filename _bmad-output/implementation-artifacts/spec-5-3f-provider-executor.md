---
title: 'Story 5-3f: provider refund executor'
type: 'feature'
created: '2026-10-12'
status: 'done'
baseline_revision: '9bf01a823865a7ced3928f1eae1c3e32f4c82dab'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - _bmad-output/implementation-artifacts/epic-5-context.md
  - _bmad-output/implementation-artifacts/stories/epic-005-story-053.md
warnings: []
deferred:
  - summary: >-
      Settlement composition in settleRefund is untested, so AC-2, AC-3 and AC-5
      live entirely in unverified code.
    evidence: |-
      Guard ordering, the pre-call compare-and-swap, four-column persistence and
      the SLA reset are all in routers/refund.ts, which no test imports. The 50
      executor tests cover pure decisions only. Closing this needs a database
      harness; packages/api has none and all ten of its test files are pure, so
      it is its own infrastructure story rather than part of this change.
    location: >-
      packages/api/src/routers/refund.ts:427
    severity: medium
  - summary: >-
      The post-call write filters on id alone, discarding the claim's
      compare-and-swap.
    evidence: |-
      Verified not exploitable today: canReviewRefund blocks `approved`,
      appealRefund requires `auto_denied`, requestRefund sees `approved` as
      open, and a second settleRefund fails the claim CAS. Latent hazard if a
      new writer is added against this row.
    location: >-
      packages/api/src/routers/refund.ts:583
    severity: medium
  - summary: >-
      Nothing drives attempts two and three, so FR-20's retry policy is
      unexecutable as delivered.
    evidence: |-
      settleRefund is an admin-only per-id call with no batch or scheduler. The
      intent contract explicitly defers the driver to 5-3g, so this is scope
      rather than a defect.
    location: >-
      packages/api/src/routers/refund.ts:427
    severity: medium
  - summary: >-
      A retry returning a different refund_ref_id is silently overwritten, so
      the cheapest double-settlement detector is unused.
    evidence: |-
      The module header names the timestamp dedup key as the double-refund
      hazard, and a changed refund_ref_id is its signature. providerRefundId is
      written without comparison against the stored value.
    location: >-
      packages/api/src/routers/refund.ts:576
    severity: medium
  - summary: >-
      A CONFLICT is thrown after the gateway moved money, recording nothing.
    evidence: |-
      When the final update matches no row the handler throws, leaving the row
      `approved` and the provider refund unrecorded. Requires the row to vanish
      mid-call.
    location: >-
      packages/api/src/routers/refund.ts:586
    severity: medium
  - summary: >-
      Escalation to human_review is implemented twice with different concurrency
      semantics.
    evidence: |-
      escalateToHumanReview CASes on status; the post-call inline path does not,
      and resolveSettlementStatus can return human_review through either route.
    location: >-
      packages/api/src/routers/refund.ts:274
    severity: low
  - summary: >-
      The missing_bank_tran_id guard is unconditional across a three-provider
      enum.
    evidence: |-
      bankTranId is only written by the SSLCommerz IPN path, so bkash and
      stripe refunds would always block. Fails safe, hence low.
    location: >-
      packages/api/src/lib/refund-executor.ts:151
    severity: low
  - summary: >-
      A refund in `processing` is a dead end with no documented 5-3g handoff.
    evidence: |-
      isRefundSettleable("processing") is false and providerRefundId is never
      queried back, so 5-3g has no stated input contract.
    location: >-
      packages/api/src/lib/refund-executor.ts:48
    severity: low
  - summary: >-
      The major-units amount contract is comment-only and asserted nowhere.
    evidence: |-
      Nothing tests AC-6's "transmitted amount is 299". The only occurrence of
      299 in the suite is a passthrough fixture on checkSettlementTarget.
    location: >-
      packages/db/src/schema/rebuild.ts:286
    severity: low
  - summary: >-
      refund-provider.ts has no test file; pickRefundId and describeThrow share
      its untested surface.
    evidence: |-
      Resolved for `toRaw` by this pass's patches, which make the module
      importable under bun test. The remaining helpers stay uncovered.
    location: >-
      packages/api/src/lib/refund-provider.ts:72
    severity: low
  - summary: >-
      settleRefund's response union is inconsistent across its five arms.
    evidence: |-
      `attempted` omits the provider's status, refundId and errorReason, so an
      admin who just spent money must re-read the row to learn the outcome.
    location: >-
      packages/api/src/routers/refund.ts:600
    severity: low
  - summary: >-
      guard.reason is documented as logged by the caller but never logged.
    evidence: |-
      skip, exhaust and the not-settleable early return emit nothing, so an
      escalation to human_review leaves no trace in the log stream.
    location: >-
      packages/api/src/routers/refund.ts:470
    severity: low
  - summary: >-
      No log line carries the acting admin on an endpoint that moves money.
    evidence: |-
      Every log call records refundId and provider fields only, so there is no
      record of who settled a refund.
    location: >-
      packages/api/src/routers/refund.ts:593
    severity: low
  - summary: >-
      The 255 truncation cap is a magic number rather than a named constant.
    evidence: |-
      It appears once, as a comment-plus-slice, with no constant name and no
      validation against the gateway's documented limit.
    location: >-
      packages/api/src/routers/refund.ts:425
    severity: low
---

<intent-contract>

## Intent

**Problem:** An approved `refundRequest` never reaches the payment provider. Story 5-3 classifies refunds into auto-approve / auto-deny / human-review and persists the decision, but nothing executes the refund, so an approved request sits forever. Three money-path defects are latent until it does: the provider dedup key is timestamp-derived, so a retry can execute a second real refund; the provider's business outcome is collapsed before we can see it, so a decline is indistinguishable from an in-flight refund; and the amount unit contract between the database and the provider is recorded incorrectly.

**Approach:** Add an executor that, for each refund ready to settle, calls the provider once, interprets the raw response, and persists the outcome — with a hard attempt guard that makes re-execution safe despite the timestamp-based dedup key. Keep every decision pure and separately testable; isolate the gateway call behind one module so the transport can be swapped later.

## Boundaries & Constraints

**Always:**
- Refund amounts are **major units** (whole taka). The database stores 299 for a ৳299 charge. Never convert.
- Provider refund requires `bank_tran_id` as `transactionId`; `paymentTransaction.bankTranId` may be null for legacy rows, which must halt rather than guess.
- Evaluate the provider's raw `status` field for the business outcome. `APIConnect` means authenticated and parsed, not refunded.
- Record `errorReason` verbatim for human triage; **never branch on it**.
- Attempt count, last-attempt time, provider refund id and provider status must be persisted on every attempt, including failures.
- Every decision — retry eligibility, outcome classification — lives in a pure exported function covered by tests.

**Never:**
- Never send a refund for a request whose status is not `approved` or `auto_approved`.
- Never exceed 3 attempts; on exhaustion fall through to `human_review`.
- Never re-attempt inside the retry window while an attempt is in flight.
- Never call the provider from a test. No network, no live gateway, no database.
- Never modify `@foxses/pay-sslcommerz` or add a fork/patch pipeline in this story.
- Never implement a background poller; that is 5-3g.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Provider refunds | raw `status: "refunded"` | `completed`; `providerRefundId` + `providerRefundStatus` persisted | none |
| Provider in flight | raw `status: "pending"` | `processing`; attempts incremented | none |
| Provider declines | raw `status: "failed"` | attempts incremented; stays `approved` while attempts < 3 | `errorReason` stored, never branched on |
| Declines exhaust | 3rd attempt declines | falls through to `human_review` | SLA reset |
| Network error | provider throws | attempts incremented, stays `approved` while attempts < 3 | error recorded |
| Guard: in flight | `lastRefundAttemptAt` inside window, attempts < 3 | skipped, no provider call | none |
| Guard: exhausted | attempts >= 3 | falls through to `human_review`, no provider call | none |
| Missing bank id | `bankTranId` null | no provider call, refund blocked | recorded as terminal problem |
| Not settled | status is `denied`/`completed`/`processing` | skipped, no provider call | none |

</intent-contract>

## Code Map

- `packages/api/src/lib/payment.ts:4` -- `gateway` singleton from `@foxses/pay`; `:53-56` `TIER_PRICING` proves major units
- `packages/api/src/lib/refund-executor.ts` -- CREATE: pure decision functions (retry eligibility, outcome classification)
- `packages/api/src/lib/refund-provider.ts` -- CREATE: the only module importing `gateway` for refunds; swappable transport
- `packages/api/src/lib/__tests__/refund-executor.test.ts` -- CREATE: tests for the pure functions
- `packages/api/src/routers/refund.ts` -- `requestRefund` classification output; `providerRefundStatus` read at `:237`. ADD settlement entry point
- `packages/db/src/schema/rebuild.ts` -- provider cols `:305-310`; `bankTranId` `:354`; WRONG comments at `:286` and `:359`
- `apps/server/src/routes/billing-ipn.ts:163-172` -- where `bankTranId` and `completedAt` are written
- `apps/server/src/jobs/tier-cleanup.ts:38-64` -- scheduling precedent: `setInterval`, `.catch(log.error)`, `handle.unref()`
- READ-ONLY, do not edit: `node_modules/.pnpm/@foxses+pay-sslcommerz@1.0.1_*/dist/sslcommerz.provider.js` — `refundPayment` at `:154-201`, dedup key `:161`, `APIConnect` check `:175`, outcome collapse `:193`

## Tasks & Acceptance

**Execution:**
- `packages/api/src/lib/refund-executor.ts` -- create pure `classifyProviderOutcome(raw)` returning a refund status plus whether it is terminal, and pure `decideRefundAttempt({attempts, lastAttemptAt, now})` returning execute / skip / exhaust. No IO.
- `packages/api/src/lib/__tests__/refund-executor.test.ts` -- cover every matrix row; assert unknown `status` values are terminal rather than silently pending
- `packages/api/src/lib/refund-provider.ts` -- create `sendRefundToProvider({bankTranId, amount, reason})` as the single gateway call site, returning raw + typed response
- `packages/api/src/routers/refund.ts` -- add an admin-only settlement procedure: load refund joined to its charge, apply the guard, call the provider, interpret, persist all four provider columns and the status transition, reset SLA on exhaustion
- `packages/db/src/schema/rebuild.ts` -- correct the two `// in poisha (BDT × 100)` comments to state major units. Comment-only; no migration.

**Acceptance Criteria:**
- Given a refund in `approved` with 0 attempts, when settlement runs, then the provider is called exactly once with the `bankTranId` and the stored `refundAmount` unchanged
- Given the provider returns raw `status: "failed"`, when settlement runs, then the refund is recorded as failed, not succeeded, and `errorReason` is stored verbatim without being branched on
- Given 3 attempts have failed, when settlement runs, then no provider call occurs and the refund falls through to `human_review`
- Given a refund already `completed`, when settlement runs, then no provider call occurs and the row is unchanged
- Given `bankTranId` is null, when settlement runs, then no provider call occurs and the refund does not move to `completed`
- Given `refundAmount` is 299, when the provider call is built, then the transmitted amount is 299 and no division occurs

## Design Notes

The provider library generates `refund_trans_id` internally as `REFUND-${Date.now()}`
(`sslcommerz.provider.js:161`) and exposes no parameter for it, so a deterministic
dedup key is unreachable through the public API. This story does not fork the
dependency. Instead the attempt guard makes re-execution safe: a refund is attempted
at most 3 times, and never twice inside the retry window. If the dedup key is later
made deterministic upstream, only `refund-provider.ts` changes.

The library reduces the provider's business outcome to `"refunded" | "pending"`
(`:193`), so a decline arrives indistinguishable from an in-flight refund. This story
therefore reads the raw response. A pure `classifyProviderOutcome` keeps the library's
shape change from leaking into the router.

Because `gateway` is a module-level singleton and no test double exists in this repo,
every decision is a pure function the tests import directly -- matching how the other
nine test files in `packages/api` work.

## Verification

**Commands:**
- `bun test packages/api` -- expected: all suites pass, including the new executor tests
- `bunx tsc --noEmit` in `packages/api` -- expected: exit 0
- `pnpm dlx ultracite check packages/api/src` -- expected: no issues

## Spec Change Log

## Review Triage Log

### 2026-10-12 — Review pass
- verdicts: 46 findings — high 1, medium 7, low 9, false 20, maybe-false 9
- findings:
  - `[high]` `[patch]` provider `cancelled` maps to local `denied`, which re-opens the duplicate-request guard — `refund-executor.ts:254` -> `refund.ts:572` -> `isOpenRefundStatus("denied")===false` (pinned by 5.3d-UNIT-028) -> `refund.ts:184-193` stops blocking that subscription. A user can file a second refund for the same charge and be auto-approved again. Mapping provider cancellation to terminal `human_review` keeps it visible without reopening the payout path. FIXED: `refund-executor.ts` now returns `human_review` terminal for `cancelled`; UNIT-014 rewritten to assert human_review and that `isOpenRefundStatus("human_review")` is true.
  - `[medium]` `[patch]` `reviewNotes: errorReason ?? row.reviewNotes` at `refund.ts:578` — `??` does not catch `""`, so a provider body with an empty `errorReason` blanks a human's review notes; the write is also unconditional, so a successful refund with a stale `errorReason` overwrites admin triage text. FIXED: the write is now `errorReason && errorReason.length > 0 ? errorReason : row.reviewNotes`, so an empty reason leaves existing notes intact.
  - `[medium]` `[patch]` `toRaw` in `refund-provider.ts:63-68` is the actual repair point for library defect 2 and has zero coverage — no test file references the module, and it cannot be imported under `bun test` because `./payment` pulls `@community/env/server`. An inverted precedence turns every decline into `processing` forever. All 50 executor tests pass regardless because they feed hand-built bodies. FIXED: the normaliser moved to `refund-provider-normalize.ts`, which imports only types and is therefore env-free; 18 new tests in `refund-provider-normalize.test.ts` cover precedence, fallback, blank rejection, refund-id precedence and describeThrow. `firstString` now rejects whitespace-only candidates, closing the same gap at source.
  - `[medium]` `[patch]` `appealRefund` at `refund.ts:297` hardcodes `7 * 24 * 60 * 60 * 1000` while `humanReviewSlaDeadline` + `HUMAN_REVIEW_SLA_DAYS` were introduced in the same file for the same transition on the same column. Verified divergence: changing the constant to 3 leaves appeals at 7 days, rendered to the user as "Decision by" at `[id].tsx:190-195`. FIXED: `appealRefund` now calls `humanReviewSlaDeadline(new Date(), HUMAN_REVIEW_SLA_DAYS)`.
  - `[medium]` `[patch]` `recordedProviderStatus` (`:299`) trims then requires `length > 0`, while `classifyProviderOutcome` (`:235`) trims and falls to `default`. On `{status:"   "}` the row records `provider_call_failed` beside `status=human_review`, labelling a terminal escalation as a retryable transport failure. No test cross-checks the two. FIXED: added `PROVIDER_STATUS_UNREADABLE = "unknown"`, used by `recordedProviderStatus` for an absent or blank status so it no longer reports a retryable transport failure; UNIT-059 runs both functions over the same bodies and asserts they do not contradict.
  - `[medium]` `[patch]` `classifyProviderOutcome` has no `completed` case, yet `toRaw` falls back to `response.status` whose type `PaymentStatus` includes `"completed"`. A body with no `status` and a collapsed `"completed"` falls to `default` -> terminal `human_review` on a genuinely refunded payment. FIXED: `"completed"` joined the `refunded`/`success` case group.
  - `[medium]` `[patch]` `REFUND_RETRY_WINDOW_MS = (24/3)h = 8h` — attempt 1 at t=0 and attempt 3 at t>=16h spans 16 hours, not the 24-hour envelope its own comment claims. `24/2 = 12h` gives 24h. 5.3f-UNIT-035 only asserts `8h * 3 === 24h`, which stays green under either reading. FIXED: window is now `24 / (MAX_REFUND_ATTEMPTS - 1)` = 12h, so attempt 1 to attempt 3 spans the full 24 hours; UNIT-035 rewritten to assert the first-to-last span rather than the product of constants.
  - `[medium]` `[defer]` settlement composition untested — `settleRefund`'s guard ordering, pre-call CAS, four-column persistence and SLA reset have no coverage, so AC-2/AC-3/AC-5 live entirely in untested code. Needs a DB harness; `packages/api` has none and all test files are pure.
  - `[medium]` `[defer]` the post-call write at `refund.ts:583` filters on id alone, discarding the claim's CAS. Checked every concurrent writer: `canReviewRefund` blocks `approved`, `appealRefund` needs `auto_denied`, `requestRefund` sees `approved` as open, a second `settleRefund` fails the claim. Not exploitable today; latent if a new writer appears.
  - `[medium]` `[defer]` nothing drives attempts 2 and 3 — `settleRefund` is an admin-only per-id call and no batch or scheduler exists, so FR-20's retry policy is unexecutable. The intent contract explicitly defers the driver to 5-3g, so this is scope, not a defect.
  - `[medium]` `[defer]` a retry returning a different `refund_ref_id` — the signature of the double refund the module header warns about — is silently overwritten with no comparison. The cheapest available detector for double settlement is unused.
  - `[medium]` `[defer]` `refund.ts:586` throws CONFLICT when the final update matches no row, after the gateway already moved money; nothing records the outcome and the row stays `approved`.
  - `[low]` `[defer]` escalation to `human_review` is implemented twice with different concurrency semantics: `escalateToHumanReview` CASes on status, the post-call inline path does not.
  - `[low]` `[defer]` the `missing_bank_tran_id` guard is unconditional across a three-provider enum, but `bankTranId` is only ever written by the SSLCommerz IPN path (`billing-ipn.ts:167`), so bkash/stripe refunds would always block. Fails safe, so low.
  - `[low]` `[defer]` `processing` is a dead end with no documented 5-3g handoff — `isRefundSettleable("processing")` is false and `providerRefundId` is never queried back.
  - `[low]` `[defer]` the amount-unit contract is comment-only; nothing asserts major units at the IPN writer and no test covers AC-6's "transmitted amount is 299".
  - `[low]` `[defer]` `refund-provider.ts` has no test file at all; `pickRefundId` and `describeThrow` share the untested module with `toRaw`, whose fix above makes the module importable in tests.
  - `[low]` `[defer]` `settleRefund`'s response union is inconsistent across five arms — `attempted` omits the provider's status, refundId and errorReason, so an admin who just spent money must re-read the row.
  - `[low]` `[defer]` `guard.reason` is documented "logged by the caller" but `skip`, `exhaust` and the not-settleable early return emit nothing, so an escalation to `human_review` leaves no log trace.
  - `[low]` `[defer]` no log line carries the acting admin on an admin-only endpoint that moves money.
  - `[low]` `[defer]` the `255` truncation cap is a magic number in a comment-plus-slice rather than a named constant validated against the gateway's limit.
  - `[false]` `[reject]` the diff contains three files twice with identical blob hashes — an artifact of my own diff staging, which concatenated a tracked `git diff` with `--no-index` output for the same paths. Not a code defect.
  - `[false]` `[reject]` test IDs 001-008 are missing — they are `canAppealRefund`/`canReviewRefund` in `refund-classifier.test.ts`; the executor suite legitimately starts at 009.
  - `[false]` `[reject]` `refundRemark` truncation to 255 loses content — `approvalReason` is only ever written from a fixed classifier reason string (`refund.ts:221-222`); admin input flows to `denialReason`. The cap is unreachable with an over-long value.
  - `[false]` `[reject]` the "never convert" rule is falsified for Stripe — Stripe's adapter multiplying by 100 is the correct major-to-minor conversion. Our 299 major becomes 29900 minor, which is right for that gateway.
  - `[false]` `[reject]` the `settleRefund` trigger shape is a divergence — the intent contract names the executor's behaviour, not its trigger, and an operator-invoked action is permitted. Recorded as an assumption.
  - `[maybe-false]` `[reject]` an Invalid Date in `lastAttemptAt` yields NaN and bypasses the retry window — needs a source of an invalid timestamp; `lastAttemptAt` comes from a Postgres timestamp.
  - `[maybe-false]` `[reject]` `describeThrow` can throw on a value with no `toString` — needs a real provider error object that is not an `Error`.
  - `[maybe-false]` `[reject]` a truthy non-`SupportedProvider` string passes the provider check — needs confirmation that `subscription.provider` cannot hold a value outside the enum.
  - `[maybe-false]` `[reject]` a non-string `raw.status` throws at `.trim()` — needs a provider body carrying a numeric `status`.
  - `[maybe-false]` `[reject]` a whitespace-only `bankTranId` passes the falsy check — needs a whitespace-padded column value; the IPN writes `typeof raw?.bank_tran_id === "string" ? ... : null`.
  - `[maybe-false]` `[reject]` `refundAmount` is never compared to `paymentTransaction.amount` — needs a row where they diverge; `requestRefund` copies `charge.amount` so they are equal by construction.
  - `[maybe-false]` `[reject]` Stripe's `succeeded`/`canceled` status words fall to `default` — needs confirmation that a Stripe refund can reach this executor.
  - `[maybe-false]` `[reject]` the exhaust branch at `refund.ts:475-484` is unreachable — my trace says no path leaves a row `approved` at 3 attempts, which makes it dead code rather than a defect.
  - `[maybe-false]` `[reject]` permanent errors are funnelled into retryable `PROVIDER_CALL_FAILED` and burn all three attempts — needs a real config-error path; it fails safe into human review.
  - `[maybe-false]` `[reject]` `REFUND_RETRY_WINDOW_MS` is imported from FR-20, outside the intent contract — the intent names a retry window but not its length, so 8h is a recorded assumption rather than a contract violation.

## Auto Run Result

Status: done

### Summary

Story 5-3f ships the provider settlement path for an approved refund. `settleRefund`
(`adminProcedure`) joins a refund to its charge, applies three guards, claims the attempt
with a compare-and-swap *before* the gateway call, calls SSLCommerz once, interprets the
raw response, and persists the provider columns and the status transition. Every decision
is a pure function in `refund-executor.ts`; the single gateway call is isolated in
`refund-provider.ts`.

Three intent gaps found during planning were resolved inside the intent-contract: amounts
are major units (AC-12's division was wrong and would have refunded 1% of the charge),
AC-10's deterministic dedup key is unreachable through the library's public API so an
attempt guard stands in for it, and AC-11's business outcome is read from the raw body
because the typed response collapses a decline into `pending`.

### Files changed

- `packages/api/src/lib/refund-executor.ts` -- NEW. Pure settlement decisions: outcome
  classification, retry eligibility, target validation, SLA helpers.
- `packages/api/src/lib/refund-provider.ts` -- NEW. The single `gateway.refundPayment`
  call site. Never throws.
- `packages/api/src/lib/refund-provider-normalize.ts` -- NEW. Env-free pure normaliser
  added by review patch 3, so the precedence that reads the provider's answer is testable
  without a gateway.
- `packages/api/src/routers/refund.ts` -- ADDED `settleRefund`, `escalateToHumanReview`,
  `refundRemark`; `appealRefund`'s inline SLA de-duplicated.
- `packages/db/src/schema/rebuild.ts` -- corrected two wrong `// in poisha (BDT x 100)`
  comments. Comment-only; no migration.
- `packages/api/src/lib/__tests__/refund-executor.test.ts` -- NEW. 52 tests.
- `packages/api/src/lib/__tests__/refund-provider-normalize.test.ts` -- NEW. 18 tests.

### Review findings breakdown

46 findings across four layers (blind-hunter, edge-case-hunter, verification-gap,
intent-alignment): 1 high, 7 medium, 9 low, 20 false, 9 maybe-false.

**Patched (7).** Provider `cancelled` mapping to `denied` re-opened the duplicate-request
guard and the double-payout path; `reviewNotes` blanked by an empty `errorReason`; the
untested precedence that reads the provider's answer; `appealRefund`'s inline SLA;
`recordedProviderStatus` contradicting `classifyProviderOutcome` on a blank status; a
missing `completed` case reachable through the adapter's collapsed field; and a retry
window that spanned 16 hours while its own comment claimed 24. Each fix is recorded
against its row in the triage log above.

**Deferred (14).** Recorded in frontmatter with evidence and severity: five medium
(settlement composition untested, post-call write missing a CAS, nothing driving attempts
two and three, undetected `refund_ref_id` drift, throw after money moved) and nine low.

**Rejected (25).** Each with its reason in the triage log. Includes one artifact of my own
diff staging (three files appeared twice because I concatenated a tracked `git diff` with
`--no-index` output for the same paths), two findings already true of code fixed earlier
in this run, and nine I could neither confirm nor refute from the diff.

### Follow-up review recommendation: true

One patched entry was `high`. The specific unverified risk: mapping provider
`status: "cancelled"` to `human_review` was decided **without a single real provider
response sample**. Story 5-3's own sandbox list records that the provider's description
of `cancelled` is self-contradictory and that no live sample was ever captured. If the
provider uses that word for something other than a merchant-side cancellation, the refund
lands in a human queue instead of settling — safe, but the wrong queue. The 12-hour retry
window is likewise unverified against real settlement latency: if the provider takes
longer than 12 hours to reflect a refund, the next attempt fires while the first may still
be in flight at the gateway.

### Verification performed

- `bun test packages/api` -- 237 pass / 0 fail across 11 files (baseline before this story:
  169 / 9 files; the three review patches moved 3 tests to the new contract and added 18)
- `bunx tsc --noEmit -p packages/api/tsconfig.json` -- exit 0
- `pnpm dlx ultracite check packages/api/src` -- clean, after one formatting pass over the
  four new/edited files

### Residual risks

- The attempt budget, not a deterministic dedup key, is what prevents a second real
  refund. If the provider ever exposes a key we control, that should replace the guard.
- Nothing schedules attempts two and three. `settleRefund` is admin-invoked and per-id;
  5-3g owns the driver.
- A refund in `processing` cannot be revisited by `settleRefund` and has no documented
  handoff to 5-3g.
- The settlement composition inside the router is unverified — it needs a database harness
  this package does not have.
- `packages/api` still has `"scripts": {}`, so `pnpm check-types` still skips it; `tsc` was
  run by hand for this story.