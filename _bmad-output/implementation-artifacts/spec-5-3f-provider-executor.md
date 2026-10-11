---
title: 'Story 5-3f: provider refund executor'
type: 'feature'
created: '2026-10-12'
status: 'ready-for-dev'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - _bmad-output/implementation-artifacts/epic-5-context.md
  - _bmad-output/implementation-artifacts/stories/epic-005-story-053.md
warnings: []
deferred: []
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