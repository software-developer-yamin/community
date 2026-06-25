import {
  addMonths,
  BILLING_PERIOD_MONTHS,
  gateway,
} from "@community/api/lib/payment";
import { db } from "@community/db";
import {
  paymentTransaction,
  subscription,
  userProfile,
} from "@community/db/schema/rebuild";
import { and, eq } from "drizzle-orm";
import { log } from "evlog";
import type { Context } from "hono";

export async function handleBillingIpn(c: Context): Promise<Response> {
  let body: Record<string, string>;
  try {
    const formData = await c.req.formData();
    body = Object.fromEntries(formData.entries()) as Record<string, string>;
  } catch {
    return c.text("OK", 200);
  }

  const tranId = body.tran_id;
  const ipnStatus = body.status;
  const valId = body.val_id;

  if (!tranId) {
    return c.text("OK", 200);
  }

  const rows = await db
    .select()
    .from(paymentTransaction)
    .where(eq(paymentTransaction.tranId, tranId))
    .limit(1);

  const tx = rows[0];
  if (!tx) {
    log.warn({ action: "billing_ipn", message: "Unknown tran_id", tranId });
    return c.text("OK", 200);
  }

  // Idempotency — already processed
  if (tx.status === "completed") {
    return c.text("OK", 200);
  }

  if (ipnStatus === "FAILED" || ipnStatus === "CANCELLED") {
    await db
      .update(paymentTransaction)
      .set({
        status: ipnStatus === "FAILED" ? "failed" : "cancelled",
        failReason: ipnStatus,
      })
      .where(eq(paymentTransaction.tranId, tranId));
    return c.text("OK", 200);
  }

  if (ipnStatus !== "VALID" || !valId) {
    return c.text("OK", 200);
  }

  // Always validate server-side — never trust IPN payload alone
  let result: { status: string; raw?: unknown };
  try {
    result = await gateway.verifyPayment("sslcommerz", {
      transactionId: valId,
    });
  } catch (err) {
    log.error({
      action: "billing_ipn",
      message: "Validation API call failed",
      tranId,
      error: String(err),
    });
    return c.text("OK", 200);
  }

  if (result.status !== "completed") {
    await db
      .update(paymentTransaction)
      .set({ status: "failed", failReason: `Validation: ${result.status}` })
      .where(eq(paymentTransaction.tranId, tranId));
    return c.text("OK", 200);
  }

  const raw = result.raw as Record<string, unknown> | undefined;
  const riskLevel = typeof raw?.risk_level === "number" ? raw.risk_level : 0;
  const bankTranId =
    typeof raw?.bank_tran_id === "string" ? raw.bank_tran_id : null;

  if (riskLevel !== 0) {
    log.warn({
      action: "billing_ipn",
      message: "Risky transaction flagged — not activating",
      tranId,
      riskLevel,
    });
    await db
      .update(paymentTransaction)
      .set({ status: "failed", riskLevel, failReason: "risk_level=1" })
      .where(eq(paymentTransaction.tranId, tranId));
    return c.text("OK", 200);
  }

  const now = new Date();
  const months =
    BILLING_PERIOD_MONTHS[
      tx.billingPeriod as keyof typeof BILLING_PERIOD_MONTHS
    ] ?? 1;
  const endsAt = addMonths(now, months);

  // Upsert subscription
  const existingSubs = await db
    .select()
    .from(subscription)
    .where(
      and(eq(subscription.userId, tx.userId), eq(subscription.status, "active"))
    )
    .limit(1);

  let subId: string;

  if (existingSubs.length > 0 && existingSubs[0]) {
    subId = existingSubs[0].id;
    await db
      .update(subscription)
      .set({
        tier: tx.tier,
        providerSubscriptionId: tranId,
        amount: tx.amount,
        startedAt: now,
        endsAt,
        status: "active",
        autoRenew: 1,
        autoRenewDisabledAt: null,
        updatedAt: now,
      })
      .where(eq(subscription.id, subId));
  } else {
    const inserted = await db
      .insert(subscription)
      .values({
        userId: tx.userId,
        tier: tx.tier,
        provider: "sslcommerz",
        providerSubscriptionId: tranId,
        amount: tx.amount,
        currency: tx.currency,
        startedAt: now,
        endsAt,
        status: "active",
        autoRenew: 1,
      })
      .returning({ id: subscription.id });
    subId = inserted[0]?.id ?? "";
  }

  // Mark transaction completed
  await db
    .update(paymentTransaction)
    .set({
      status: "completed",
      valId,
      bankTranId,
      riskLevel,
      subscriptionId: subId,
      completedAt: now,
    })
    .where(eq(paymentTransaction.tranId, tranId));

  // Upgrade user tier
  await db
    .update(userProfile)
    .set({ tier: tx.tier, tierExpiresAt: endsAt })
    .where(eq(userProfile.userId, tx.userId));

  log.info({
    action: "billing_ipn",
    message: "Payment activated",
    tranId,
    tier: tx.tier,
    userId: tx.userId,
  });

  return c.text("OK", 200);
}
