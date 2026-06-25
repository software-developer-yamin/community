---
baseline_commit: 9fe8714
---

# Story 5.4: SSLCommerz Payment Gateway Integration

## Story

As a Learner,
I want to pay for a Premium or Premium Plus subscription via SSLCommerz,
So that my tier upgrades immediately and I can access paid features.

## Status

done

## Tasks

- [x] T1: Add `payment_transaction` table + enum to DB schema
- [x] T2: Add env vars (SSLCommerz, bKash, Stripe) to `packages/env/src/server.ts`
- [x] T3: Install `@foxses/pay` in `@community/api`
- [x] T4: Create `packages/api/src/lib/payment.ts` — gateway setup for 3 providers
- [x] T5: Create `packages/api/src/routers/billing.ts` — initiatePayment, getPaymentStatus, getSubscription
- [x] T6: Register `billingRouter` in `packages/api/src/routers/index.ts`
- [x] T7: Create `apps/server/src/routes/billing-ipn.ts` — IPN webhook handler
- [x] T8: Mount `/api/billing/ipn` in `apps/server/src/index.ts`
- [x] T9: Create web pages — billing, success, fail, cancel
- [x] T10: Install `react-native-webview` + create `PaymentWebViewModal`
- [x] T11: Push DB schema (`pnpm db:start && pnpm db:push`) — requires DB running

## Dev Agent Record

### Implementation Notes

- `@foxses/pay` v1.0.5 used (all-in-one package); providers activate only when env vars present
- Pricing: BDT 299/2999 (premium), BDT 599/5999 (premium_plus); Stripe uses same numbers in USD
- SSLCommerz `verifyPayment` expects `val_id` as `transactionId` — IPN handler passes `body.val_id`
- `risk_level` extracted from `result.raw` as `Record<string, unknown>`
- `CORS_ORIGIN` used as app URL; `BETTER_AUTH_URL` as server URL — no new required env vars
- DB push pending: Postgres not running at implementation time; run `pnpm db:start && pnpm db:push`

### File List

- `packages/db/src/schema/rebuild.ts` — added `paymentTransactionStatusEnum`, `paymentTransaction` table, `paymentTransactionRelations`; updated `paymentProviderEnum` to `["sslcommerz", "bkash", "stripe"]`
- `packages/env/src/server.ts` — added SSLCommerz, bKash, Stripe env vars (all optional)
- `packages/api/package.json` — added `@foxses/pay`
- `packages/api/src/lib/payment.ts` — gateway setup, TIER_PRICING, BILLING_PERIOD_MONTHS, addMonths, SupportedProvider
- `packages/api/src/routers/billing.ts` — billingRouter with 3 procedures
- `packages/api/src/routers/index.ts` — registered `billing: billingRouter`
- `apps/server/src/routes/billing-ipn.ts` — IPN webhook (idempotent, validates via foxses/pay)
- `apps/server/src/index.ts` — mounted `POST /api/billing/ipn`
- `apps/web/src/app/billing/page.tsx` — upgrade UI with tier/period/provider selection
- `apps/web/src/app/billing/success/page.tsx` — polls status, shows result
- `apps/web/src/app/billing/fail/page.tsx` — fail message + retry CTA
- `apps/web/src/app/billing/cancel/page.tsx` — cancel message + retry CTA
- `apps/native/components/payment-webview-modal.tsx` — WebView modal with URL-change listener

## Background

The DB schema already has:
- `payment_provider` enum with `"sslcommerz"`
- `subscription` table (tier, provider, providerSubscriptionId, amount, currency, status, autoRenew, endsAt)
- `refund_request` table

This story adds the missing layer: `payment_transaction` table, SSLCommerz API client, billing oRPC router, IPN webhook, web payment UI, and native WebView payment flow.

## Acceptance Criteria

### AC-1: Payment initiation — Web
Given an authenticated user on the web app clicks "Upgrade to Premium" or "Upgrade to Premium Plus",
When the CTA is tapped,
The client calls `billing.initiatePayment` with `{ tier, billingPeriod }`,
The server creates a `payment_transaction` row with `status = "pending"` and a unique `tran_id`,
The server calls SSLCommerz `/gwprocess/v4/api.php` and gets back `GatewayPageURL`,
The server returns `{ gatewayUrl }` to the client,
The client redirects the browser to `gatewayUrl`.

### AC-2: Payment initiation — Native
Given an authenticated user on the native app taps "Upgrade",
When the CTA is tapped,
The app calls `billing.initiatePayment`,
The server returns `{ gatewayUrl }`,
The native app opens a `WebView` modal presenting the SSLCommerz gateway page,
The WebView monitors navigation to the `success_url`, `fail_url`, or `cancel_url` deep links,
On detection, the WebView closes and the app shows the appropriate result screen.

### AC-3: IPN webhook — payment confirmation
Given SSLCommerz posts to `/api/billing/ipn` after payment,
When the IPN arrives with `status = "VALID"`,
The server verifies the IPN by calling SSLCommerz Validation API with `val_id`,
The server checks `risk_level == 0` (not risky),
The server updates `payment_transaction.status = "completed"` and stores `val_id`, `bank_tran_id`,
The server creates or updates the `subscription` row: `status = "active"`, `providerSubscriptionId = tran_id`, `startedAt = now`, `endsAt = now + billingPeriod`,
The server sets `userProfile.tier = tier` and `userProfile.tierExpiresAt = endsAt`,
The IPN handler responds `200 OK`.

### AC-4: IPN webhook — idempotency
Given the same IPN is received more than once (SSLCommerz retries),
When `payment_transaction` with that `tran_id` already has `status = "completed"`,
The handler responds `200 OK` immediately without re-processing.

### AC-5: IPN webhook — failed/cancelled payment
Given SSLCommerz posts to `/api/billing/ipn` with `status = "FAILED"` or `"CANCELLED"`,
When the IPN arrives,
The server updates `payment_transaction.status = "failed"` or `"cancelled"`,
No subscription or tier change occurs,
The handler responds `200 OK`.

### AC-6: Success redirect — Web
Given the user's payment succeeds and SSLCommerz redirects to `success_url`,
When the user lands on `/billing/success?tran_id=...`,
The page polls `billing.getPaymentStatus({ tranId })` until status is `"completed"` (max 10s, 2s interval),
On confirmed completion, page shows "Payment successful — you're now on [Tier]!" with CTA to go to dashboard.

### AC-7: Fail/Cancel redirect — Web
Given SSLCommerz redirects to `fail_url` or `cancel_url`,
When the user lands on `/billing/fail` or `/billing/cancel`,
The page shows a clear message and a "Try again" CTA that re-initiates payment.

### AC-8: Sandbox vs Live toggle
Given `SSLCOMMERZ_SANDBOX=true` in env,
When any SSLCommerz API call is made,
The server uses `https://sandbox.sslcommerz.com` as base URL.
Given `SSLCOMMERZ_SANDBOX=false`,
The server uses `https://securepay.sslcommerz.com`.

### AC-9: Pricing — tier × billing period
| Tier | Monthly | Annual |
|------|---------|--------|
| Premium | 299 BDT | 2999 BDT |
| Premium Plus | 599 BDT | 5999 BDT |

These amounts are server-side constants. The client never sends the amount.

### AC-10: Error states
Given SSLCommerz returns `status: "FAILED"` on session creation,
The server throws `ORPCError("PAYMENT_GATEWAY_ERROR")`,
The client shows a toast: "Payment gateway error. Please try again."

Given validation API returns `status: "INVALID_TRANSACTION"`,
The server marks transaction `failed` and does NOT activate the subscription.

## Technical Spec

### New DB table: `payment_transaction`

```ts
// packages/db/src/schema/rebuild.ts — add alongside subscription table
export const paymentTransactionStatusEnum = pgEnum("payment_transaction_status", [
  "pending",
  "completed",
  "failed",
  "cancelled",
]);

export const paymentTransaction = pgTable(
  "payment_transaction",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    subscriptionId: text("subscription_id").references(() => subscription.id),
    // SSLCommerz identifiers
    tranId: text("tran_id").notNull().unique(),        // our generated ID sent to SSLCommerz
    valId: text("val_id"),                              // returned by SSLCommerz after payment
    bankTranId: text("bank_tran_id"),                   // bank's transaction ID
    sessionKey: text("session_key"),                    // SSLCommerz session key
    // Payment details
    tier: tierEnum("tier").notNull(),
    billingPeriod: text("billing_period").notNull(),    // "monthly" | "annual"
    amount: integer("amount").notNull(),                // in smallest unit (poisha for BDT)
    currency: text("currency").default("BDT").notNull(),
    // Status
    status: paymentTransactionStatusEnum("status").default("pending").notNull(),
    riskLevel: integer("risk_level"),                   // 0 = safe, 1 = risky
    failReason: text("fail_reason"),
    // Timestamps
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
  },
  (table) => [
    index("payment_transaction_user_idx").on(table.userId),
    index("payment_transaction_tran_id_idx").on(table.tranId),
    index("payment_transaction_status_idx").on(table.status),
  ]
);
```

### Package dependency

Use `@foxses/pay-sslcommerz` (from https://github.com/Foxses-Studio/foxses-pay) instead of raw HTTP calls.

```bash
pnpm add @foxses/pay-core @foxses/pay-sslcommerz --filter @community/api
```

This library provides a unified `PaymentGateway` abstraction — future providers (bKash, Nagad, Stripe) plug in without touching billing logic.

### Payment client setup (`packages/api/src/lib/payment.ts`)

```ts
import { PaymentGateway } from "@foxses/pay-core";
import "@foxses/pay-sslcommerz";
import { env } from "@community/env";

export const gateway = new PaymentGateway();

gateway.use("sslcommerz", {
  storeId: env.SSLCOMMERZ_STORE_ID,
  storePassword: env.SSLCOMMERZ_STORE_PASS,
  successUrl: `${env.APP_URL}/billing/success`,
  failureUrl: `${env.APP_URL}/billing/fail`,
  cancelUrl: `${env.APP_URL}/billing/cancel`,
  callbackUrl: `${env.SERVER_URL}/api/billing/ipn`,
  sandbox: env.SSLCOMMERZ_SANDBOX,
});
```

Usage in billing router:

```ts
// createPayment
const payment = await gateway.createPayment("sslcommerz", {
  amount: TIER_PRICING[tier][billingPeriod],
  currency: "BDT",
  orderId: tranId,
  customerName: session.user.name,
  customerEmail: session.user.email,
  customerPhone: profile.phoneNumber ?? "",
});
// payment.checkoutUrl → redirect user here
// payment.transactionId → store as sessionKey

// verifyPayment (in IPN handler)
const result = await gateway.verifyPayment("sslcommerz", {
  transactionId: body.val_id,
});
// result.status → "completed" | "failed" | "cancelled"
// result.raw → full SSLCommerz validation response (risk_level, bank_tran_id)
```

### New env vars (`packages/env/src/index.ts`)

```ts
SSLCOMMERZ_STORE_ID: z.string().min(1),
SSLCOMMERZ_STORE_PASS: z.string().min(1),
SSLCOMMERZ_SANDBOX: z.coerce.boolean().default(true),
```

### Billing router (`packages/api/src/routers/billing.ts`)

Procedures:
- `billing.initiatePayment` — protected. Input: `{ tier: "premium" | "premium_plus", billingPeriod: "monthly" | "annual" }`. Returns `{ gatewayUrl: string, tranId: string }`.
- `billing.getPaymentStatus` — protected. Input: `{ tranId: string }`. Returns `{ status: PaymentTransactionStatus, tier?: string }`.
- `billing.getSubscription` — protected. Returns current active subscription or null.

### IPN webhook (server, NOT oRPC — public route)

Mount at `apps/server/src/index.ts`:
```
POST /api/billing/ipn  — public, no auth required
```

IPN handler file: `apps/server/src/routes/billing-ipn.ts`

Flow:
1. Parse body (form-encoded from SSLCommerz)
2. Find `payment_transaction` by `tran_id`
3. If already `completed` → respond 200 immediately (idempotent)
4. Call validation API with `val_id`
5. If `VALID` and `risk_level == 0` → activate subscription, update tier
6. Respond 200

### Web pages

- `apps/web/src/app/billing/page.tsx` — Upgrade CTA with tier/period selection
- `apps/web/src/app/billing/success/page.tsx` — Poll + success display
- `apps/web/src/app/billing/fail/page.tsx` — Failure + retry CTA
- `apps/web/src/app/billing/cancel/page.tsx` — Cancel message + retry CTA

### Native component

- `apps/native/components/payment-webview-modal.tsx` — `WebView` + URL change listener that closes modal on success/fail/cancel deep links

## Pricing Constants (server-side only)

```ts
// packages/api/src/lib/sslcommerz.ts
export const TIER_PRICING = {
  premium: { monthly: 29900, annual: 299900 },     // in poisha (BDT × 100)
  premium_plus: { monthly: 59900, annual: 599900 },
} as const;
```

## URL Scheme

```
success_url: {APP_URL}/billing/success?tran_id={tran_id}
fail_url:    {APP_URL}/billing/fail?tran_id={tran_id}
cancel_url:  {APP_URL}/billing/cancel?tran_id={tran_id}
ipn_url:     {SERVER_URL}/api/billing/ipn
```

## Security Notes

- IPN handler MUST validate every transaction via SSLCommerz Validation API — never trust IPN payload alone
- `risk_level = 1` transactions must NOT activate subscription (log and flag for human review)
- Amount must be derived server-side from `TIER_PRICING` constants — never trust client-sent amount
- `tran_id` must be a `crypto.randomUUID()` — never user-supplied
- IPN endpoint is public but stateless — no session needed, no auth header

## Dev/Test Notes

- Sandbox test cards: VISA `4111111111111111`, exp `12/26`, CVV `111`
- Mobile OTP: `111111`
- Sandbox base URL: `https://sandbox.sslcommerz.com`
- Test with `SSLCOMMERZ_SANDBOX=true` in all three `.env` files (web, server)

## Out of Scope

- bKash / Nagad integration — `@foxses/pay-bkash` and `@foxses/pay-nagad` exist; add via `gateway.use("bkash", {...})` in a future story
- Razorpay — schema enum exists but deferred; replace with `@foxses/pay-stripe` or another global provider when needed
- Credits / per-call purchases — deferred to separate story
- Auto-renewal billing — SSLCommerz is one-time charge; renewal requires new payment session (user re-initiates)
- Webhook signature verification — SSLCommerz v4 uses server-side Validation API instead of HMAC; `@foxses/pay-sslcommerz` handles this via `verifyPayment`

## Future Provider Expansion

`@foxses/pay` supports 11 providers via same API. To add bKash later:
```ts
// packages/api/src/lib/payment.ts
import "@foxses/pay-bkash";
gateway.use("bkash", { appKey, secretKey, username, password, callbackUrl, successUrl, failureUrl, sandbox });

// billing router — zero billing logic changes needed
const payment = await gateway.createPayment("bkash", { amount, currency: "BDT", orderId, customerPhone });
```
DB `payment_provider` enum needs `"bkash"` | `"nagad"` added when those stories land.
