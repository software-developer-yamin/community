/**
 * Tests for the charge-selection predicate behind requestRefund.
 *
 * A refund must reverse the charge that belongs to the subscription being
 * refunded. paymentTransaction.subscriptionId exists precisely so that link can
 * be enforced; selecting by userId alone can hand back another subscription's
 * charge, and refundAmount and paymentTransactionId would follow it.
 *
 * The predicate is compiled to SQL with drizzle's QueryBuilder rather than
 * executed, so this runs without a database.
 *
 * Run from repo root:
 *   bun test packages/api/src/lib/__tests__/refund-charge-filter.test.ts
 */

import { describe, expect, test } from "bun:test";
import { paymentTransaction } from "@community/db/schema/rebuild";
import { QueryBuilder } from "drizzle-orm/pg-core";

import { completedChargeForSubscription } from "../refund-charge-filter";

function compile(userId: string, subscriptionId: string) {
  return new QueryBuilder()
    .select({ id: paymentTransaction.id })
    .from(paymentTransaction)
    .where(completedChargeForSubscription(userId, subscriptionId))
    .toSQL();
}

describe("completedChargeForSubscription", () => {
  test("5.3e-UNIT-001: filters by user, subscription and completed status", () => {
    const sql = compile("user-1", "sub-1").sql;

    expect(sql).toContain('"payment_transaction"."user_id"');
    expect(sql).toContain('"payment_transaction"."subscription_id"');
    expect(sql).toContain('"payment_transaction"."status"');
  });

  test("5.3e-UNIT-002: binds both ids as parameters", () => {
    const query = compile("user-1", "sub-1");

    expect(query.params).toEqual(["user-1", "sub-1", "completed"]);
  });

  test("5.3e-UNIT-003: a different subscription binds a different id", () => {
    const query = compile("user-1", "sub-2");

    expect(query.params).toEqual(["user-1", "sub-2", "completed"]);
  });

  test("5.3e-UNIT-004: excludes pending, failed and cancelled charges", () => {
    const sql = compile("user-1", "sub-1").sql;

    expect(sql).not.toContain("'pending'");
    expect(sql).not.toContain("'failed'");
    expect(sql).not.toContain("'cancelled'");
  });
});
