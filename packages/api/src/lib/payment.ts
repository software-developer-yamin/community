import { env } from "@community/env/server";
import { PaymentGateway } from "@foxses/pay";

export const gateway = new PaymentGateway();

const appUrl = env.CORS_ORIGIN;
const serverUrl = env.BETTER_AUTH_URL;

// ── SSLCommerz (Bangladesh) ───────────────────────────────────────
if (env.SSLCOMMERZ_STORE_ID && env.SSLCOMMERZ_STORE_PASS) {
  gateway.use("sslcommerz", {
    storeId: env.SSLCOMMERZ_STORE_ID,
    storePassword: env.SSLCOMMERZ_STORE_PASS,
    successUrl: `${appUrl}/billing/success`,
    failureUrl: `${appUrl}/billing/fail`,
    cancelUrl: `${appUrl}/billing/cancel`,
    callbackUrl: `${serverUrl}/api/billing/ipn`,
    sandbox: env.SSLCOMMERZ_SANDBOX,
  });
}

// ── bKash (Bangladesh) ────────────────────────────────────────────
if (
  env.BKASH_APP_KEY &&
  env.BKASH_APP_SECRET &&
  env.BKASH_USERNAME &&
  env.BKASH_PASSWORD
) {
  gateway.use("bkash", {
    appKey: env.BKASH_APP_KEY,
    appSecret: env.BKASH_APP_SECRET,
    username: env.BKASH_USERNAME,
    password: env.BKASH_PASSWORD,
    callbackUrl: `${serverUrl}/api/billing/bkash/callback`,
    successUrl: `${appUrl}/billing/success`,
    failureUrl: `${appUrl}/billing/fail`,
    sandbox: env.BKASH_SANDBOX,
  });
}

// ── Stripe (Global) ───────────────────────────────────────────────
if (env.STRIPE_SECRET_KEY) {
  gateway.use("stripe", {
    apiKey: env.STRIPE_SECRET_KEY,
    webhookSecret: env.STRIPE_WEBHOOK_SECRET,
    successUrl: `${appUrl}/billing/success`,
    failureUrl: `${appUrl}/billing/cancel`,
  });
}

// ── Pricing (server-side only — never trust client amounts) ───────
// BDT for SSLCommerz/bKash, USD for Stripe.
export const TIER_PRICING = {
  premium: { monthly: 299, annual: 2999 },
  premium_plus: { monthly: 599, annual: 5999 },
} as const;

export type BillingTier = keyof typeof TIER_PRICING;
export type BillingPeriod = keyof (typeof TIER_PRICING)[BillingTier];

export const BILLING_PERIOD_MONTHS: Record<BillingPeriod, number> = {
  monthly: 1,
  annual: 12,
};

export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

export type SupportedProvider = "sslcommerz" | "bkash" | "stripe";
