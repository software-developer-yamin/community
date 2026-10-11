import { paymentTransaction } from "@community/db/schema/rebuild";
import { and, eq } from "drizzle-orm";

/** Selects the charge a refund reverses. Scoped to one subscription as well as
 *  one user: userId alone can return another subscription's charge, and
 *  refundAmount and paymentTransactionId are both copied from it. */
export function completedChargeForSubscription(
  userId: string,
  subscriptionId: string
) {
  return and(
    eq(paymentTransaction.userId, userId),
    eq(paymentTransaction.subscriptionId, subscriptionId),
    eq(paymentTransaction.status, "completed")
  );
}
