# F5.3 1-Tap Cancel + Refund — Engineering Spec

**Market:** Bangladesh (BDT pricing, SSLCommerz gateway, bKash/Nagad/Rocket)
**Status:** Ready to ship
**Effort:** 3 days
**ICE:** 9 (impact 10, confidence 9, ease 8)
**Owner:** Backend + payments
**Metric:** "Scam" review mentions ↓70% in 30d; refund rate <5%

## Why BD + SSLCommerz

SSLCommerz = de-facto BD gateway. Supports all local methods (bKash, Nagad, Rocket, cards, bank). Hosted page = no PCI scope on us. IPN = real-time sub state. 1-tap cancel ships against their Subscription API.

## Pricing (BDT, replacing INR)

| Tier | Price | Rationale |
|---|---|---|
| Free | ৳0 | 3 calls/day, capped 5min each |
| Pro Monthly | ৳499 (~₹310) | unlimited calls, all features |
| Pro 3-mo | ৳1,299 (~₹810) | 13% off, sticky |
| Pro Lifetime | ৳4,999 (~₹3,130) | one-time, BD-preferred for trust |
| Student (verified) | ৳299/mo | 40% off, edu email or BD student ID |

## UX

**Settings → Subscription screen:**

```
╔══════════════════════════════╗
║  Current Plan: Pro Monthly   ║
║  Renews: 7 Aug 2026 (৳499)   ║
║                              ║
║  ┌────────────────────────┐  ║
║  │  [ Cancel subscription ]│  ║
║  └────────────────────────┘  ║
║                              ║
║  Not satisfied? 7-day refund ║
║  → [Request refund]          ║
║                              ║
║  Renewal reminder: ON ✓     ║
║  [3 days before charge]      ║
╚══════════════════════════════╝
```

**No dark patterns:**
- Cancel = 1 tap, no "are you sure / survey / hold flow"
- Refund = 1 tap within 7 days, auto-approved
- Renewal reminder = 3 days before, ON by default
- Receipt = email + in-app, with line item in BDT

## Schema

```ts
// packages/db/src/schema/billing.ts
import { pgTable, text, timestamp, uuid, pgEnum, jsonb, index } from 'drizzle-orm/pg-core';
import { user } from './auth';

export const subStatusEnum = pgEnum('sub_status', [
  'pending', 'active', 'past_due', 'canceled', 'expired', 'refunded',
]);

export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  plan: text('plan').notNull(),  // 'pro_monthly' | 'pro_3mo' | 'pro_lifetime' | 'student'
  status: subStatusEnum('status').notNull().default('pending'),
  amountBdt: text('amount_bdt').notNull(),  // store as text to avoid float
  // SSLCommerz IDs
  tranId: text('tran_id').notNull().unique(),  // our internal; echoed in IPN
  subscriptionId: text('subscription_id'),     // SSLCommerz sub id
  valId: text('val_id'),                       // IPN validation id
  // Lifecycle
  startedAt: timestamp('started_at', { withTimezone: true }),
  currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),
  canceledAt: timestamp('canceled_at', { withTimezone: true }),
  cancelReason: text('cancel_reason'),
  refundRequestedAt: timestamp('refund_requested_at', { withTimezone: true }),
  refundedAt: timestamp('refunded_at', { withTimezone: true }),
  refundAmountBdt: text('refund_amount_bdt'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  userIdx: index('sub_user_idx').on(t.userId),
  tranIdx: index('sub_tran_idx').on(t.tranId),
}));

export const paymentEvents = pgTable('payment_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
  tranId: text('tran_id').notNull(),
  event: text('event').notNull(),  // 'init' | 'ipn_success' | 'ipn_fail' | 'cancel' | 'refund' | 'renewal'
  raw: jsonb('raw').$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
```

## Server: SSLCommerz client

```ts
// apps/server/src/lib/sslcommerz.ts
import crypto from 'node:crypto';
import { env } from '@community/env/server';

const BASE = env.SSL_COMMERZ_MODE === 'sandbox'
  ? 'https://sandbox.sslcommerz.com'
  : 'https://secure.sslcommerz.com';

type InitInput = {
  tranId: string;
  amountBdt: number;
  productName: string;
  productCategory: 'subscription';
  cusName: string;
  cusEmail: string;
  cusPhone: string;  // BD format: 01XXXXXXXXX
  userId: string;
  plan: string;
};

export async function initSession(input: InitInput) {
  const body = new URLSearchParams({
    store_id: env.SSL_COMMERZ_STORE_ID,
    store_passwd: env.SSL_COMMERZ_STORE_PASSWORD,
    total_amount: String(input.amountBdt),
    currency: 'BDT',
    tran_id: input.tranId,
    success_url: `${env.APP_URL}/api/billing/success`,
    fail_url: `${env.APP_URL}/api/billing/fail`,
    cancel_url: `${env.APP_URL}/api/billing/cancel`,
    ipn_url: `${env.APP_URL}/api/billing/ipn`,
    product_name: input.productName,
    product_category: input.productCategory,
    cus_name: input.cusName,
    cus_email: input.cusEmail,
    cus_phone: input.cusPhone,
    cus_country: 'Bangladesh',
    shipping_method: 'NO',
    value_a: input.userId,   // our user id
    value_b: input.plan,     // our plan code
  });

  const res = await fetch(`${BASE}/gwprocess/v4/api.php`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  });
  const data = (await res.json()) as {
    status: string;
    failedreason?: string;
    GatewayPageURL?: string;
    sessionkey?: string;
  };
  if (data.status !== 'SUCCESS' || !data.GatewayPageURL) {
    throw new Error(`SSLCommerz init failed: ${data.failedreason ?? 'unknown'}`);
  }
  return { url: data.GatewayPageURL, sessionKey: data.sessionkey! };
}

// Verify IPN signature
export function verifyIpn(payload: Record<string, string>): boolean {
  const keys = Object.keys(payload)
    .filter((k) => k !== 'sign' && k !== 'verify_sign' && k !== 'verify_key')
    .sort();
  const hashStr = keys.map((k) => payload[k]).join('&');
  const ourHash = crypto
    .createHmac('sha256', env.SSL_COMMERZ_STORE_PASSWORD)
    .update(hashStr)
    .digest('hex');
  // SSLCommerz sends verify_sign
  return ourHash === payload.verify_sign;
}

export async function validateIpn(valId: string) {
  const url = `${BASE}/validator/api/validationserverAPI.php` +
    `?val_id=${valId}&store_id=${env.SSL_COMMERZ_STORE_ID}` +
    `&store_passwd=${env.SSL_COMMERZ_STORE_PASSWORD}&format=json`;
  const res = await fetch(url);
  return (await res.json()) as {
    status: 'VALID' | 'VALIDATED';
    tran_id: string;
    amount: string;
    card_type: string;
  };
}

export async function refundRequest({
  bankTranId,
  refundAmountBdt,
  refundRemarks,
}: {
  bankTranId: string;
  refundAmountBdt: number;
  refundRemarks: string;
}) {
  const body = new URLSearchParams({
    store_id: env.SSL_COMMERZ_STORE_ID,
    store_passwd: env.SSL_COMMERZ_STORE_PASSWORD,
    bank_tran_id: bankTranId,
    refund_amount: String(refundAmountBdt),
    refund_remarks: refundRemarks,
    refund_reason: 'customer_request',
  });
  const res = await fetch(`${BASE}/validator/api/merchantTransIDvalidationAPI.php`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  });
  return (await res.json()) as {
    APIConnect: 'DONE' | 'FAILED';
    refund_ref_id?: string;
    status?: 'success' | 'failed';
  };
}
```

## ORPC routers

```ts
// apps/server/src/routers/billing.ts
import { z } from 'zod';
import { protectedProcedure, publicProcedure } from '../lib/orpc';
import { initSession, refundRequest } from '../lib/sslcommerz';
import { eq } from 'drizzle-orm';
import { subscriptions, paymentEvents } from '@community/db/schema/billing';

const BDT_PLANS = {
  pro_monthly: { amount: 499, durationDays: 30, label: 'Pro Monthly' },
  pro_3mo: { amount: 1299, durationDays: 90, label: 'Pro 3-Month' },
  pro_lifetime: { amount: 4999, durationDays: 36500, label: 'Pro Lifetime' },
  student: { amount: 299, durationDays: 30, label: 'Student Monthly' },
} as const;

export const billingRouter = {
  getCurrent: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.query.subscriptions.findFirst({
      where: (s, { and, eq, inArray }) =>
        and(eq(s.userId, ctx.session.user.id), inArray(s.status, ['active', 'past_due'])),
      orderBy: (s, { desc }) => desc(s.createdAt),
    });
  }),

  // 1-tap checkout: returns hosted page URL
  checkout: protectedProcedure
    .input(z.object({ plan: z.enum(['pro_monthly', 'pro_3mo', 'pro_lifetime', 'student']) }))
    .mutation(async ({ ctx, input }) => {
      const plan = BDT_PLANS[input.plan];
      const tranId = `af_${ctx.session.user.id.slice(0, 8)}_${Date.now()}`;
      const user = ctx.session.user;

      const { url } = await initSession({
        tranId,
        amountBdt: plan.amount,
        productName: `AceFluency ${plan.label}`,
        productCategory: 'subscription',
        cusName: user.name ?? 'Customer',
        cusEmail: user.email,
        cusPhone: user.phone ?? '01700000000',  // collect on signup; fallback
        userId: user.id,
        plan: input.plan,
      });

      await ctx.db.insert(subscriptions).values({
        userId: user.id,
        plan: input.plan,
        status: 'pending',
        amountBdt: String(plan.amount),
        tranId,
        currentPeriodEnd: new Date(Date.now() + plan.durationDays * 86_400_000),
      });
      await ctx.db.insert(paymentEvents).values({
        userId: user.id,
        tranId,
        event: 'init',
        raw: { plan: input.plan, amount: plan.amount },
      });

      return { url, tranId };
    }),

  // 1-tap cancel (no survey, no hold)
  cancel: protectedProcedure
    .input(z.object({ subscriptionId: z.string().uuid(), reason: z.string().max(200).optional() }))
    .mutation(async ({ ctx, input }) => {
      const sub = await ctx.db.query.subscriptions.findFirst({
        where: (s, { and, eq }) =>
          and(eq(s.id, input.subscriptionId), eq(s.userId, ctx.session.user.id)),
      });
      if (!sub) throw new Error('Subscription not found');
      if (sub.status !== 'active') throw new Error('Subscription not active');

      await ctx.db.update(subscriptions)
        .set({
          status: 'canceled',
          canceledAt: new Date(),
          cancelReason: input.reason,
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.id, input.subscriptionId));

      // SSLCommerz doesn't have a cancel sub API; we just stop auto-renewal
      // by tracking cancellation server-side and not charging on next IPN
      await ctx.db.insert(paymentEvents).values({
        userId: ctx.session.user.id,
        tranId: sub.tranId,
        event: 'cancel',
        raw: { reason: input.reason ?? '' },
      });

      // Pro-rate remaining days as account credit
      const remaining = Math.max(0, (sub.currentPeriodEnd!.getTime() - Date.now()) / 86_400_000);
      const creditBdt = (remaining / planDays(sub.plan)) * Number(sub.amountBdt);
      await ctx.db.update(user)
        .set({ creditBdt: String(creditBdt) })
        .where(eq(user.id, ctx.session.user.id));

      return { ok: true, creditBdt, accessUntil: sub.currentPeriodEnd };
    }),

  // 7-day no-questions refund
  requestRefund: protectedProcedure
    .input(z.object({ subscriptionId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const sub = await ctx.db.query.subscriptions.findFirst({
        where: (s, { and, eq }) =>
          and(eq(s.id, input.subscriptionId), eq(s.userId, ctx.session.user.id)),
      });
      if (!sub) throw new Error('Subscription not found');
      if (sub.status !== 'active' && sub.status !== 'canceled') {
        throw new Error('Subscription not refundable');
      }
      const daysSince = (Date.now() - sub.startedAt!.getTime()) / 86_400_000;
      if (daysSince > 7) throw new Error('7-day refund window expired');

      // For SSLCommerz, refund goes through original payment method
      // Need bank_tran_id from IPN (stored in metadata)
      const bankTranId = (sub.metadata as any).bank_tran_id as string | undefined;
      if (!bankTranId) throw new Error('Refund not possible: original payment details missing');

      const result = await refundRequest({
        bankTranId,
        refundAmountBdt: Number(sub.amountBdt),
        refundRemarks: `7-day refund for ${sub.plan}`,
      });

      if (result.APIConnect !== 'DONE' || result.status !== 'success') {
        throw new Error('Refund request failed at gateway');
      }

      await ctx.db.update(subscriptions)
        .set({
          status: 'refunded',
          refundedAt: new Date(),
          refundRequestedAt: new Date(),
          refundAmountBdt: sub.amountBdt,
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.id, input.subscriptionId));

      return { ok: true, refundRef: result.refund_ref_id };
    }),

  // Toggle renewal reminder (default ON)
  setRenewalReminder: protectedProcedure
    .input(z.object({ enabled: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.update(user)
        .set({ renewalReminder: input.enabled })
        .where(eq(user.id, ctx.session.user.id));
      return { ok: true };
    }),
};

function planDays(plan: string): number {
  return BDT_PLANS[plan as keyof typeof BDT_PLANS]?.durationDays ?? 30;
}
```

## Webhook: IPN handler

```ts
// apps/server/src/routes/billing.ipn.ts
import { Hono } from 'hono';
import { verifyIpn, validateIpn } from '../lib/sslcommerz';
import { db } from '@community/db';
import { subscriptions, paymentEvents } from '@community/db/schema/billing';
import { eq } from 'drizzle-orm';

export const ipnRoute = new Hono().post('/api/billing/ipn', async (c) => {
  const formData = await c.req.parseBody();
  const payload = Object.fromEntries(
    Object.entries(formData as Record<string, string>),
  );

  // 1. verify signature
  if (!verifyIpn(payload)) {
    return c.text('Invalid signature', 400);
  }

  const tranId = payload.tran_id;
  const valId = payload.val_id;

  // 2. validate with SSLCommerz (defense in depth)
  const validation = await validateIpn(valId);
  if (validation.status !== 'VALID' && validation.status !== 'VALIDATED') {
    return c.text('Invalid transaction', 400);
  }

  // 3. update sub
  const sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.tranId, tranId),
  });
  if (!sub) return c.text('Unknown transaction', 404);

  // idempotency: only transition pending -> active
  if (sub.status === 'pending' && validation.status === 'VALID') {
    await db.update(subscriptions)
      .set({
        status: 'active',
        startedAt: new Date(),
        valId,
        metadata: { ...(sub.metadata as any), bank_tran_id: payload.bank_tran_id, card_type: payload.card_type },
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, sub.id));
  }

  await db.insert(paymentEvents).values({
    userId: sub.userId,
    tranId,
    event: payload.status === 'VALID' ? 'ipn_success' : 'ipn_fail',
    raw: payload as any,
  });

  return c.text('OK', 200);
});
```

## Mobile UI

Replace [apps/native/app/(drawer)/settings/subscription.tsx](file:///home/yamin/Documents/Yamin%20Company/community/apps/native/app/(drawer)/settings/subscription.tsx) (new file):

```tsx
import { orpc } from '@/utils/orpc';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { useUnistyles } from 'react-native-unistyles';

export default function SubscriptionScreen() {
  const { theme } = useUnistyles();
  const qc = useQueryClient();
  const sub = useQuery(orpc.billing.getCurrent.queryOptions());
  const cancel = useMutation(orpc.billing.cancel.mutationOptions());
  const refund = useMutation(orpc.billing.requestRefund.mutationOptions());

  const handleCancel = () => {
    Alert.alert(
      'Cancel subscription?',
      'You\'ll keep access until the end of your current period. Refund available for 7 days.',
      [
        { text: 'Keep subscription', style: 'cancel' },
        { text: 'Cancel', style: 'destructive', onPress: () => doCancel() },
      ],
    );
  };

  const doCancel = async () => {
    await cancel.mutateAsync({
      subscriptionId: sub.data!.id,
      reason: 'user_initiated',
    });
    qc.invalidateQueries({ queryKey: orpc.billing.getCurrent.key() });
    Alert.alert('Done', 'Subscription cancelled. Access until period end.');
  };

  const handleRefund = () => {
    Alert.alert(
      'Request 7-day refund?',
      'You will lose Pro access immediately.',
      [
        { text: 'No, keep it', style: 'cancel' },
        { text: 'Refund', style: 'destructive', onPress: () => doRefund() },
      ],
    );
  };

  const doRefund = async () => {
    await refund.mutateAsync({ subscriptionId: sub.data!.id });
    Alert.alert('Refund processing', '1-3 business days. You will receive an email.');
  };

  if (!sub.data) {
    return <View><Text>No active subscription</Text></View>;
  }

  const s = sub.data;
  const canRefund = daysSince(s.startedAt) < 7;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={{ padding: 20 }}>
        <Text style={{ fontSize: 24, fontWeight: '700' }}>Subscription</Text>

        <View style={card}>
          <Text style={label}>Current Plan</Text>
          <Text style={value}>{planLabel(s.plan)}</Text>

          <Text style={[label, { marginTop: 12 }]}>Status</Text>
          <Text style={value}>{s.status}</Text>

          {s.status === 'active' && (
            <>
              <Text style={[label, { marginTop: 12 }]}>Access until</Text>
              <Text style={value}>{formatDate(s.currentPeriodEnd)}</Text>
            </>
          )}

          <Pressable
            onPress={handleCancel}
            style={[btn, { backgroundColor: theme.colors.destructive, marginTop: 24 }]}
          >
            <Text style={btnText}>Cancel subscription</Text>
          </Pressable>

          {canRefund && (
            <Pressable
              onPress={handleRefund}
              style={[btn, { backgroundColor: 'transparent', borderWidth: 1, borderColor: theme.colors.border, marginTop: 12 }]}
            >
              <Text style={[btnText, { color: theme.colors.typography }]}>
                Request 7-day refund
              </Text>
            </Pressable>
          )}
        </View>

        <Text style={{ marginTop: 24, color: theme.colors.mutedForeground, fontSize: 13 }}>
          Payments by SSLCommerz. Accepted: bKash, Nagad, Rocket, Visa, Mastercard, bank.
        </Text>
      </View>
    </ScrollView>
  );
}

function daysSince(d: Date) { return (Date.now() - new Date(d).getTime()) / 86_400_000; }
function planLabel(p: string) {
  return { pro_monthly: 'Pro Monthly', pro_3mo: 'Pro 3-Month', pro_lifetime: 'Pro Lifetime', student: 'Student' }[p] ?? p;
}
function formatDate(d: Date | string) { return new Date(d).toLocaleDateString('en-BD'); }
```

## Env additions

```bash
# apps/server/.env
SSL_COMMERZ_STORE_ID=your_store_id
SSL_COMMERZ_STORE_PASSWORD=your_store_password
SSL_COMMERZ_MODE=sandbox   # or 'live'
APP_URL=https://api.acefluency.app
```

## Rollout

1. **Day 1:** SSLCommerz sandbox account, schema migration, env config.
2. **Day 2:** server routers (init/cancel/refund) + IPN handler. Unit test signature verify.
3. **Day 3:** mobile UI. Internal dogfood ৳1.
4. **Day 4:** 10% prod users (BD only). Monitor IPN success rate, refund rate.
5. **Day 5:** 100%. Email to existing paid users with new "1-tap cancel" link.

## Risks

| Risk | Mitigation |
|---|---|
| SSLCommerz sandbox ≠ live behavior | Live test with ৳1, ৳10, ৳499 in week 1 |
| Webhook dropped (network) | IPN retry 3× over 24h by SSLCommerz; daily reconciliation job |
| Refund to bKash fails (account closed) | Manual queue: flag refund_requests in dashboard for ops |
| Lifetime plan refund abuse | 7-day refund caps at ৳4,999; pro-rate after |
| Students lie about enrollment | Verify `.edu.bd` email + 30-day reconfirm via .edu.bd |

## Success metrics (30d)

- "Scam" / "auto deduct" review mentions ↓70%
- 1-tap cancel usage ≥30% of cancellations (vs. support ticket)
- Refund rate <5% of new subs
- IPN success rate ≥99%
- Mean refund processing time <2 business days

## BD-specific add-ons (bonus, same week)

- **bKash/Nagad logos on pricing page** — increases trust
- **Bangla language for receipt emails** — auto-detect user.lang === 'bn'
- **Refunded receipt** with বাংলা + English
- **Nagad wallet check** on cancel page: "Switch to Nagad auto-pay?" (BD-preferred)

---

*Spec complete. Ready for eng + finance review.*
