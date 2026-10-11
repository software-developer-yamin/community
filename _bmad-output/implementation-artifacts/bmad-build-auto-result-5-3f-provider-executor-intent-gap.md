---
status: blocked
---

# BMad Build Auto Result

Status: blocked

Blocking condition: intent gap

## Intent resolved

Implement story **5-3f provider-executor** — the component that executes the actual
provider-side refund for an approved `refundRequest`. Selected as the highest-severity
remaining work because it carries three money-path acceptance criteria (AC-10, AC-11,
AC-12) and blocks completion of story 5-3.

Planning halted at step-02 item 5. No implementation step ran.

## Context loaded

- `_bmad-output/implementation-artifacts/epic-5-context.md` (compiled this run)
- Story 5-3 spec AC-10/AC-11/AC-12, plus the 4 review fixes committed on
  `fix/story-5-3-refund-review-findings`

## Unanswered questions

### Q1 — AC-12 mandates a unit conversion whose premise the code contradicts

AC-12 states `paymentTransaction.amount` is stored in poisha (minor units) and that the
executor must divide by 100 before sending `refund_amount`. The implemented charge path
stores and transmits **major units**:

| Step | Value | Evidence |
|---|---|---|
| Tier price | `299` | `packages/api/src/lib/payment.ts:53-56` |
| Written to DB | `amount: 299` | `packages/api/src/routers/billing.ts:40-51` |
| Sent to provider | `total_amount: "299.00"` | `@foxses/pay-sslcommerz/dist/sslcommerz.provider.js:52` |

The charge path completes successfully (`apps/server/src/routes/billing-ipn.ts:163-172`),
so the stored integer is whole taka. The schema comments at
`packages/db/src/schema/rebuild.ts:286` and `:359` (`// in poisha (BDT × 100)`) are
incorrect. `packages/db/src/schema/rebuild.ts:239-240` uses a different, correct comment
(`smallest currency unit`).

**Readings, with observably different outcomes:**

- **A — implement AC-12 literally.** Divide by 100. A ৳299 refund transmits
  `refund_amount: "2.99"`. Users receive 1% of the amount owed. This is the opposite
  failure mode from the 100x over-refund AC-12 was written to prevent.
- **B — treat the stored value as major units and correct the schema comments instead.**
  No conversion at the boundary. The refund transmits `"299.00"`, matching the charge.
  AC-12 as written is not satisfied and must be amended.

Nothing in the story, PRD, or addendum selects between A and B.

### Q2 — AC-10 cannot be satisfied through the payment library's public API

AC-10 requires a deterministic `refund_trans_id` derived from `refundRequest.id`, because
a timestamp-derived key lets a retry after a network timeout execute as a second real
refund.

The key is generated inside the vendored dependency and is not a parameter:

```js
// node_modules/.pnpm/@foxses+pay-sslcommerz@1.0.1_.../sslcommerz.provider.js:161
const refundTransId = `REFUND-${Date.now()}`;
```

It is transmitted as `refund_trans_id` (`:170`). The public signature
`refundPayment(params)` accepts only `transactionId` (the `bank_tran_id`), `amount`, and
`reason`. There is no way to supply a deterministic key through this API.

**Readings, with observably different outcomes:**

- **A — call `gateway.refundPayment` as-is.** Minimal new code and keeps the bKash and
  Stripe providers reachable. AC-10 is not satisfied and the retry double-refund risk in
  AC-6 remains open.
- **B — bypass the library.** Call SSLCommerz's `merchantTransIDvalidationAPI.php`
  directly with a project-owned HTTP client and a deterministic `refund_trans_id`. AC-10 is
  satisfied. Hand-rolls auth, HTTP, and response parsing, and drops the other providers.
- **C — fork or vendor `@foxses/pay-sslcommerz`.** AC-10 satisfied with the library
  intact. Requires a patch pipeline and a dependency-maintenance commitment.

Nothing in the story, PRD, or architecture selects between A, B, and C.

### Q3 — AC-11's `status` check is partly unobservable through the library's response

AC-11 requires the executor to evaluate both `APIConnect` (transport/auth) and `status`
(business outcome), recording `errorReason` verbatim but never branching on it.

The library throws when `APIConnect !== "DONE"`
(`sslcommerz.provider.js:175-177`) and then reduces the business outcome to a binary:

```js
// sslcommerz.provider.js:193
status: statusData.status === "refunded" ? "refunded" : "pending"
```

A **declined** refund and an **in-flight** refund both arrive as `"pending"`. The
`RefundResponse` type exposes only `"refunded" | "pending"`. The distinction AC-11 requires
exists only in `RefundResponse.raw`.

- **A — classify from `raw.status`.** Honours AC-11 as written; couples the executor to
  the provider's raw response shape.
- **B — classify from the typed `status`.** Cannot distinguish declined from pending, so
  AC-11 is satisfied only in part.

Nothing in the story selects between A and B.

## Evidence summary

| Fact | Source |
|---|---|
| No first-party refund code exists; only the library's | repo-wide search; `packages/api/src/routers/refund.ts` writes classification only |
| `REFUND-${Date.now()}` is library-internal | `sslcommerz.provider.js:161` |
| `refundPayment` takes no `refund_trans_id` | `sslcommerz.provider.js:154-173` |
| Amounts are major units | `payment.ts:53-56` -> `billing.ts:40-41` -> `sslcommerz.provider.js:52` |
| "poisha" schema comments are wrong | `packages/db/src/schema/rebuild.ts:286`, `:359` |
| Library checks `APIConnect` only, then collapses outcome | `sslcommerz.provider.js:175-193` |
| Retry needs `bank_tran_id` as `transactionId` | `sslcommerz.provider.js:156` |
| No queue/cron; a job precedent exists | `apps/server/src/jobs/tier-cleanup.ts`, `apps/server/src/index.ts:37` |
| Every test in `packages/api` is pure; no gateway double exists | 9 test files inspected |

## Progress preserved

- `epic-5-context.md` — compiled and committed
- The 4 review fixes — committed on `fix/story-5-3-refund-review-findings`
  (`012b3c5`, `ee1a9da`, `4945935`, `c48e828`)