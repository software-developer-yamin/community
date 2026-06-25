import { db } from "@community/db";
import {
  paymentTransaction,
  subscription,
  userProfile,
} from "@community/db/schema/rebuild";
import { ORPCError } from "@orpc/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure } from "../index";
import {
  type BillingPeriod,
  type BillingTier,
  gateway,
  type SupportedProvider,
  TIER_PRICING,
} from "../lib/payment";

const PROVIDER_CURRENCY: Record<SupportedProvider, string> = {
  sslcommerz: "BDT",
  bkash: "BDT",
  stripe: "USD",
};

const SUPPORTED_PROVIDERS = ["sslcommerz", "bkash", "stripe"] as const;

const initiatePayment = protectedProcedure
  .input(
    z.object({
      tier: z.enum(["premium", "premium_plus"]),
      billingPeriod: z.enum(["monthly", "annual"]),
      provider: z.enum(SUPPORTED_PROVIDERS).default("sslcommerz"),
    })
  )
  .handler(async ({ context, input }) => {
    const { tier, billingPeriod, provider } = input;
    const userId = context.session.user.id;

    const amount =
      TIER_PRICING[tier as BillingTier][billingPeriod as BillingPeriod];
    const currency = PROVIDER_CURRENCY[provider];
    const tranId = crypto.randomUUID();

    await db.insert(paymentTransaction).values({
      userId,
      tranId,
      tier,
      billingPeriod,
      amount,
      currency,
      status: "pending",
    });

    let payment: { checkoutUrl?: string; transactionId: string };
    try {
      payment = await gateway.createPayment(provider, {
        amount,
        currency,
        orderId: tranId,
        customerName: context.session.user.name ?? "",
        customerEmail: context.session.user.email ?? "",
        customerPhone: "",
        metadata: {
          productName: `Community ${tier === "premium_plus" ? "Premium Plus" : "Premium"} — ${billingPeriod}`,
          productCategory: "subscription",
          productProfile: "general",
        },
      });
    } catch (err) {
      await db
        .update(paymentTransaction)
        .set({
          status: "failed",
          failReason: String(err),
        })
        .where(eq(paymentTransaction.tranId, tranId));
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Payment gateway error. Please try again.",
      });
    }

    if (!payment.checkoutUrl) {
      await db
        .update(paymentTransaction)
        .set({ status: "failed", failReason: "No checkoutUrl returned" })
        .where(eq(paymentTransaction.tranId, tranId));
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Payment gateway error. Please try again.",
      });
    }

    await db
      .update(paymentTransaction)
      .set({ sessionKey: payment.transactionId })
      .where(eq(paymentTransaction.tranId, tranId));

    return { gatewayUrl: payment.checkoutUrl, tranId, provider };
  });

const getPaymentStatus = protectedProcedure
  .input(z.object({ tranId: z.string().min(1) }))
  .handler(async ({ context, input }) => {
    const rows = await db
      .select()
      .from(paymentTransaction)
      .where(
        and(
          eq(paymentTransaction.tranId, input.tranId),
          eq(paymentTransaction.userId, context.session.user.id)
        )
      )
      .limit(1);

    const tx = rows[0];
    if (!tx) {
      throw new ORPCError("NOT_FOUND", { message: "Transaction not found" });
    }

    return { status: tx.status, tier: tx.tier };
  });

const getSubscription = protectedProcedure.handler(async ({ context }) => {
  const userId = context.session.user.id;

  const profile = await db
    .select()
    .from(userProfile)
    .where(eq(userProfile.userId, userId))
    .limit(1);

  const activeRows = await db
    .select()
    .from(subscription)
    .where(
      and(eq(subscription.userId, userId), eq(subscription.status, "active"))
    )
    .orderBy(desc(subscription.createdAt))
    .limit(1);

  return {
    tier: profile[0]?.tier ?? "free",
    subscription: activeRows[0] ?? null,
  };
});

export const billingRouter = {
  initiatePayment,
  getPaymentStatus,
  getSubscription,
};
