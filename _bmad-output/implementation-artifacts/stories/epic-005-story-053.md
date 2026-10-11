---
baseline_commit: 9fe8714
---

# Story 5.3: Refund Mechanism

**GH Issue:** [#18](https://github.com/software-developer-yamin/community/issues/18)

## Story

As a Learner,
I want to request a refund for a non-working product through a clear in-app flow,
So that I can recover my money when the product doesn't work.

## Status

ready-for-dev

## Context: What Is Already Built

The database is complete. This story is service logic against a finished schema — no
migration work.

- `refundRequest` table with the full three-path structure: `path` (`auto_approve` |
  `auto_deny` | `human_review`), `status` (8-state `refund_status` enum), all five trigger
  columns, the provider-refund block (`providerRefundId`, `providerRefundStatus`,
  `providerRefundAttempts`, `lastRefundAttemptAt`), and `slaDeadline`.
  — `packages/db/src/schema/rebuild.ts`
- `crashEvent` table (`type` ∈ `force_close | anr | black_screen`, plus `appVersion`,
  `osVersion`, `deviceModel`, `stackTrace`) with a `(userId, createdAt)` index for
  range queries. — `packages/db/src/schema/rebuild.ts:493`
- `reportCrash(type, message)` builds a structured crash report from Expo constants and
  `Platform.Version`, never throws. — `apps/native/utils/crash-reporter.ts`
- `reportCrash` is imported and wired in `apps/native/app/_layout.tsx`.
- Subscription lifecycle: `subscription` table with `status` ∈
  `active | cancelled | expired | refunded | free`, plus `tierExpiresAt`. Story 5.5
  (cancellation preserves access) is `done`.
- Gateway charge path exists in `packages/api/src/lib/payment.ts` (`gateway`,
  `TIER_PRICING`, `BILLING_PERIOD_MONTHS`) and the IPN handler at
  `apps/server/src/routes/billing-ipn.ts`.

**Zero refund service logic exists today.** `packages/api/src/routers/billing.ts`,
`packages/api/src/lib/payment.ts`, and `apps/server/src/routes/billing-ipn.ts` contain no
refund code. The only trace of the feature in source is the `"refunded"` string in
`packages/api/src/types/subscription.ts:15`.

## Decision Records

FR-20 in `_bmad-output/planning-artifacts/prds/prd-community-2026-06-09/prd.md` §4.5, with
the threshold matrix at `addendum.md` §B.

**Resolved 2026-10-11 — auto-deny threshold.** The PRD contradicted itself: §4.5 FR-20 said
auto-deny at `>5 completed sessions`, `addendum.md` §B said `≥1 completed session`. The
adversarial review (`review-adversarial.md`, `[high]`) identified that the `≥1` rule would
auto-deny the exact user FR-20 exists to protect — one 5-minute call followed by 72 hours of
login failure. **Ship the AND rule: auto-deny only when `>5 completed sessions` AND
`>14 days since charge`.** Either condition alone routes to human review. This supersedes
both §4.5 and addendum §B.

## Threshold Matrix (resolved)

| Trigger | Path | Amount | Window |
|---|---|---|---|
| ≥3 critical crashes | `auto_approve` | Full charge | First 7 days post-charge |
| Never completed a session | `auto_approve` | Full charge | First 14 days post-charge |
| Login failure >72h with an open ticket | `auto_approve` | Full charge | First 14 days post-charge |
| >5 sessions **and** >14 days since charge | `auto_deny` | — | — |
| Any other edge case | `human_review` | — | 7-day SLA |

Precedence: auto-approve is evaluated first and wins over auto-deny. A user with 9 sessions
who still crashes 4 times in their first week gets the refund.

## Acceptance Criteria

### AC-1: Refund request form

**Given** I have a paid subscription
**When** I navigate to Subscription → Request refund
**Then** I see a refund request form with my purchase history
**And** the decision path is shown once I submit

### AC-2: Crash-triggered auto-approve

**Given** I have ≥3 critical crashes in my first 7 days
**When** I request a refund
**Then** the system auto-approves within 24 hours
**And** I see: "Refund approved — processing with payment provider"

### AC-3: Never-connected auto-approve

**Given** I have never completed a session
**When** I request a refund within 14 days
**Then** the system auto-approves within 24 hours

### AC-4: Auto-deny with explanation and appeal

**Given** I have >5 completed sessions AND requested more than 14 days after charge
**When** I request a refund
**Then** the system auto-denies with the plain-language explanation
**And** I can appeal for human review

### AC-5: Gray area to human review

**Given** my refund request is in a gray area
**When** the system classifies it
**Then** it goes to human review with a 7-day SLA (`slaDeadline`)
**And** the decision is shown in-app

### AC-6: Provider retry policy

**Given** a refund is approved
**When** the payment provider returns an error
**Then** the system retries up to 3 times over 24 hours
**And** the user sees "Refund approved — processing with payment provider"
**And** on retry exhaustion the request falls through to `human_review`

## Acceptance Criteria (amendments)

These are gaps in the original six that must ship with this story. They are not optional.

### AC-7: Crash reports persist to `crashEvent`

**Given** a crash occurs on device
**When** `reportCrash` is called
**Then** a row is persisted to `crashEvent` with `userId`, `type`, and device metadata
**And** the write is fire-and-forget — it never blocks or throws on the crash path

**Without this, AC-2 is unimplementable.** `reportCrash` currently returns an in-memory
object that is discarded. `crashEvent` has no writer, so the `triggerCrashes` count is
always zero and no user can ever be auto-approved on the crash path. This is the single
hardest blocker in the story.

### AC-8: Login-failure duration is measurable

**Given** the `login_failure` auto-approve path
**When** the classifier runs
**Then** the duration of the user's unresolved login failure is computable

**Without this, the third auto-approve row is dead.** `refundRequest.triggerLoginFailure`
exists as a column, but nothing in `apps/` or `packages/` records a login failure or a
successful login. There is no `lastLoginAt` and no failure counter. Either instrument login
success/failure and derive the duration, or drop the row from the matrix and say so — do not
ship a trigger that can never fire.

### AC-9: Crash type set matches the schema

`crashEvent.type` is a free-text column documented as `force_close | anr | black_screen`.
`reportCrash` also emits `runtime_error`. The classifier must count only the three refund-
qualifying types; `runtime_error` is excluded from `triggerCrashes` unless deliberately
included and documented.

### AC-10: `refund_trans_id` is deterministic

**Given** a `refundRequest` row
**When** the executor initiates the provider refund
**Then** `refund_trans_id` is derived from `refundRequest.id`, not from a timestamp
**And** retrying the same request sends the identical `refund_trans_id`

**Rationale:** `refund_trans_id` became mandatory on 2025-02-24 and is the gateway's
dedup key. The existing adapter generates `REFUND-${Date.now()}`, which changes on every
attempt — a retry after a network timeout would carry a different ID and could execute as a
second real refund. This is a double-refund bug class in a payment path.

### AC-11: Both `APIConnect` AND `status` are checked

**Given** the provider returns HTTP 200 with `APIConnect: "DONE"` and `status: "failed"`
**When** the executor evaluates the result
**Then** the refund is recorded as failed, not succeeded
**And** `errorReason` is stored verbatim for human triage

**Rationale:** every documented response is HTTP 200 — errors are in the body only.
`APIConnect` describes transport/auth (`DONE | FAILED | INACTIVE | INVALID_REQUEST`);
`status` describes the business outcome (`success | failed | processing`). `DONE` means
"authenticated and parsed", not "refunded". The existing adapter checks only `APIConnect`,
so a declined refund is recorded as successful.

**Never branch on `errorReason`.** It is free text (255 chars) with no enumerated code and
no published failure list. Record it for humans; branch only on `APIConnect` and `status`.

### AC-12: Amount conversion at the boundary

**Given** `paymentTransaction.amount` is stored in poisha (integer, minor units)
**When** the executor builds `refund_amount`
**Then** the value is divided by 100 and formatted as a decimal string in whole taka

**Rationale:** SSLCommerz `refund_amount` is `decimal(10,2)` in **major** units — doc example
`refund_amount=5.50` means 5 taka 50 poisha. The adapter passes `params.amount.toFixed(2)`
straight through, so passing poisha refunds 100× the intended amount. No conversion exists
anywhere in the current codebase.

### AC-13: `refundRequest` schema migration

**Given** the current `refundRequest` table
**When** a refund is recorded
**Then** the row carries the refunded amount and the source transaction

**Requires two new columns:**
- `refundAmount` — integer, the poisha amount requested
- `paymentTransactionId` — FK to `paymentTransaction.id`

**Rationale:** the table currently has neither, and links only to `subscriptionId`. For a
partial refund you cannot record *how much* was requested; with multiple charges on one
subscription you cannot determine *which* charge was refunded. Partial refunds are explicitly
supported by the gateway — there is no "full refund" flag, only an amount.

### AC-14: Provider status maps onto `refundStatusEnum`

**Given** the gateway query returns `refunded | processing | cancelled`
**When** the poller updates `refundRequest.status`
**Then** an explicit mapping function translates gateway vocabulary to local vocabulary

```
refunded     → completed
processing   → processing
cancelled    → denied        (local enum has no `cancelled` member)
```

**Rationale:** `refundStatusEnum` is `pending | auto_approved | auto_denied | human_review |
approved | denied | processing | completed`. It has no `cancelled` member, and `completed` is
not the gateway's word. The adapter returns the literal `"refunded"`, which the local enum
cannot store. An explicit mapping is required — do not let gateway strings leak into the DB.

### AC-15: Settlement is polled, never pushed

**Given** an approved refund in `processing`
**When** the poller runs on schedule
**Then** it queries the status endpoint for each non-terminal row and updates
`providerRefundStatus` and `status`
**And** rows past `slaDeadline` are escalated

**Rationale:** **SSLCommerz has no refund webhook.** The documented IPN covers payments only
(`status` ∈ `VALID | FAILED | CANCELLED | UNATTEMPTED | EXPIRED`). Refund settlement is
entirely poll-driven. `apps/server/src/routes/billing-ipn.ts` needs **no modification** and
provides no refund signal.

Documented settlement lag is hours to days — one official example shows `initiated_on` at
23:48 and `refunded_on` at 08:53 the next morning, with 5–7 working days to the customer.
A refund is never synchronous, so `refunded` is effectively unobservable immediately after
initiation.

## Technical Notes

### Do Not Modify

- `packages/db/src/schema/rebuild.ts` — the schema is complete and correct for this story
- `packages/api/src/lib/payment.ts` charge path — story 5.4 is `done`, do not regress
- `apps/server/src/routes/billing-ipn.ts` charge IPN — same

### The three-path classifier is pure

Classification reads only from `crashEvent`, `subscription`, `paymentTransaction`, and
completed-session counts, and returns `{ path, status, denialReason?, approvalReason?, slaDeadline }`
without performing I/O beyond those reads. Keep it pure so the full matrix is unit-testable
without a database or a gateway. Provider execution is a separate step that consumes the
classification.

### Amounts

**Resolved in the Provider Integration section — read AC-12.** `TIER_PRICING` is the source of
truth for tier pricing; `paymentTransaction.amount` is in poisha; SSLCommerz wants whole taka.
Convert at the boundary.

### Schema migration required

AC-13 adds `refundAmount` and `paymentTransactionId` to `refundRequest`. This story therefore
**does** touch `packages/db/src/schema/rebuild.ts` — the exception to "do not modify", and the
only part of the schema this story changes. Everything else in that file stays as-is.

## Sandbox Verification Gates

The implementation must not ship until items 1 and 2 below are answered against the sandbox,
because they change the design rather than merely validate it:

1. **Duplicate refund call** — does the second call return the original `refund_ref_id`?
   Decides whether AC-10's guard is belt-and-braces or load-bearing.
2. **Forced failure shape** — capture the exact `APIConnect`/`status`/`errorReason` triple.
   Confirms AC-11's branch structure against reality rather than documentation.

Items 3–7 in the Provider Integration queue are still required before production, but do not
block starting the classifier and instrumentation work.

### Out of Scope

- **Pro-rated / partial refunds.** Explicitly out of scope per story 5.5. Full charge only.
- **Threshold tuning after launch.** Ship the matrix above; tune from data after the first
  1000 refund requests.
- **Multi-currency.** BDT only.

## Provider Integration — SSLCommerz

Confirmed against `sandbox-gw.sslcommerz.com/docs`, `developer.sslcommerz.com/doc/v4`, the
official `sslcommerz/SSLCommerz-NodeJS` SDK, and the live SOAP WSDL. Compiled 2026-10-11.

### ⚠️ `@foxses/pay` already implements refunds — with five defects

`packages/api` routes payments through `@foxses/pay`, not SSLCommerz directly. The adapter
`@foxses/pay-sslcommerz@1.0.1` **already has `refundPayment()`**. This story is therefore not
"integrate an unknown API" — it is **correct the existing adapter, close two schema gaps, and
add a settlement poller**. Writing a fresh implementation from scratch would re-introduce the
same defects.

| # | Defect | Severity |
|---|---|---|
| 1 | `refund_trans_id` = `REFUND-${Date.now()}` — non-deterministic, breaks retry dedup | 🔴 |
| 2 | Checks only `APIConnect !== "DONE"`, never `data.status` — records failures as success | 🔴 |
| 3 | Queries status immediately after initiating — always `processing`, no information | 🟠 |
| 4 | `params.amount.toFixed(2)` passes caller value through — no poisha→taka conversion | 🟠 |
| 5 | Returns `data.refund_ref_id` unconditionally — it is absent on failure | 🟠 |

Defects 1 and 2 are money-loss bugs. Fix them before shipping.

### Endpoints

Both operations hit the **same URL**, disambiguated only by which query parameters are sent:

```
Initiate : GET /validator/api/merchantTransIDvalidationAPI.php
Query    : GET /validator/api/merchantTransIDvalidationAPI.php
```

The URL does not identify the operation. Guard on which params were sent, never on the path.

Hosts: `https://sandbox.sslcommerz.com` (sandbox) · `https://securepay.sslcommerz.com`
(production). Separate store IDs — a sandbox store ID is rejected against production.

⚠️ Refunds are **not** served from `sandbox-gw.sslcommerz.com`, which appears in current docs
for session init only. Targeting that host produces a working charge and a 404 refund.

### Authentication

Credentials travel as **query-string parameters**, not headers — the method is GET:

```
store_id=<id>&store_passwd=<password>
```

Note the non-standard `_passwd` suffix. Required in production as well as sandbox; the doc
example `testbox`/`qwerty` is a public sandbox pair.

⚠️ **Credentials therefore appear in URLs.** Expect them in access logs, proxy logs, and
`Referer` headers. Never route this call through anything that logs full URLs.

⚠️ Production additionally requires your **public IP to be whitelisted**. This is the most
common production-only refund failure and has no sandbox equivalent.

### Request fields

| Field | Required | Notes |
|---|---|---|
| `bank_tran_id` | yes | **Not** `tran_id` — these are different IDs and `tran_id` is not accepted |
| `refund_trans_id` | yes | Merchant-generated unique ID. **Mandatory since 2025-02-24**, max 30 chars |
| `refund_amount` | yes | `decimal(10,2)` in **major units** — see AC-12 |
| `refund_remarks` | yes | Reason, max 255 chars |
| `refe_id` | no | Merchant reference for reconciliation |
| `format` | no | `json` (default) |

There is **no `currency` parameter** on refunds. Do not send one.

**Two stale-source traps:** `refund_trans_id` is absent from the official Node SDK and the
v3.5 docs (the SDK predates the 2025-02-24 change), and `v=1` appears in curl examples without
being a documented parameter. Send `format=json`; treat `v=1` as optional.

**This codebase already gets `bank_tran_id` right.** `billing-ipn.ts` captures
`raw.bank_tran_id` from the verification response and persists it to
`paymentTransaction.bankTranId`. Preserve that.

### Response

```json
{ "APIConnect": "DONE", "bank_tran_id": "...", "refund_ref_id": "...", "status": "success", "errorReason": "" }
```

`refund_ref_id` is the handle for later status queries — persist it to
`refundRequest.providerRefundId`. It is **absent when initiation fails**, so guard on presence
explicitly.

Three distinct IDs, do not conflate: `refund_trans_id` (ours, sent) → `refund_ref_id`
(theirs, persisted) → `bank_tran_id` (the original charge).

### Errors — HTTP 200 always

Every documented response is HTTP 200. **Branch on the body, never the status code.** The
official docs' own "failed" examples still show `APIConnect: "DONE"`.

`APIConnect`: `DONE` · `FAILED` (auth) · `INACTIVE` (store) · `INVALID_REQUEST` (bad data)
`status`: `success` · `failed` · `processing` ("refund has been initiated already")

No enumerated business-error codes are published. Validation failures surface as
`INVALID_REQUEST` with free-text `errorReason` and no field-level detail — validate before
calling.

### Idempotency

`status: "processing"` on initiate means the refund was already initiated. This is the only
documented anti-duplicate signal and implies gateway-side dedup.

**Semantics are under-specified.** Whether a repeat call returns the original
`refund_ref_id` or returns `processing` with no ID is not documented — and that answer decides
whether a guard is mandatory. Build the guard from existing columns
(`providerRefundId`, `providerRefundAttempts`, `lastRefundAttemptAt`) plus the deterministic
`refund_trans_id` from AC-10 regardless of how this resolves.

### Time limits

**No API-level refund window is documented.** The 7-day figure in SSLCommerz's merchant T&C
is a chargeback-risk rule, not an API constraint — do not treat it as one. `triggerDaysSinceCharge`
is our policy choice, currently 14.

### Sandbox verification queue

Run before finalising. Items 1 and 2 gate the implementation.

1. **Double-refund probe** — issue the same refund twice, diff both bodies. Does the second
   return the original `refund_ref_id`, or `processing` with none? *(decides the AC-10 guard)*
2. **Failure probe** — force a failure, capture the exact `APIConnect`/`status`/`errorReason`
   triple and HTTP status. *(confirms AC-11)*
3. **Full sequence** — initiate, poll to terminal, measure real settlement lag to calibrate
   the AC-15 poller.
4. **Units probe** — refund `1.00`, confirm it credits 1 taka and not 100 poisha. *(AC-12)*
5. **Partial repeat** — two sequential partials on one charge; confirm both succeed and check
   for a total ceiling.
6. **`cancelled` semantics** — the docs describe `cancelled` as *"Refund request has been
   proceeded successfully"*, which is self-contradictory. It most likely means "successfully
   cancelled". Obtain a real cancelled refund before finalising AC-14's mapping.
7. **Unregistered IP** — call production from an unwhitelisted IP and capture the error shape.

## File List

**Create**

- `packages/api/src/services/refund-classifier.ts` — pure three-path classification
- `packages/api/src/services/refund-executor.ts` — provider execution + retry/backoff
- `packages/api/src/routers/refund.ts` — request / status / appeal / admin-review procedures
- `apps/native/utils/crash-reporter.ts` — add persistence (modify, see AC-7)
- `apps/native/app/(app)/refund/request.tsx` — request form
- `apps/native/app/(app)/refund/[id].tsx` — status + decision display

**Modify**

- `packages/api/src/routers/index.ts` — mount `refundRouter`
- `apps/native/app/(app)/subscription.tsx` — Request refund entry point

## Out of Scope

- Web admin refund review UI — the admin surface for `human_review` decisions is a
  separate story
- Email/push notification of decisions beyond the in-app state
- Threshold analytics dashboard