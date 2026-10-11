/**
 * Tests for the provider-response normaliser.
 *
 * These functions decide how the payment provider's own answer is read, which
 * is the repair point for the adapter collapsing a decline into "pending". They
 * live outside `refund-provider.ts` precisely so they can be imported without
 * `@community/env` or a live gateway.
 *
 * Run from repo root:
 *   bun test packages/api/src/lib/__tests__/refund-provider-normalize.test.ts
 */

import { describe, expect, test } from "bun:test";
import type { RefundResponse } from "@foxses/pay";

import {
  describeThrow,
  firstString,
  isRecord,
  pickRefundId,
  toRaw,
} from "../refund-provider-normalize";

function response(overrides: Partial<RefundResponse> = {}): RefundResponse {
  return {
    refundId: "",
    transactionId: "bank-tran-1",
    amount: 299,
    status: "pending",
    raw: {},
    ...overrides,
  } as RefundResponse;
}

describe("isRecord", () => {
  test("5.3g-UNIT-001: accepts plain objects and rejects the rest", () => {
    expect(isRecord({})).toBe(true);
    expect(isRecord({ status: "refunded" })).toBe(true);

    expect(isRecord(null)).toBe(false);
    expect(isRecord(undefined)).toBe(false);
    expect(isRecord([])).toBe(false);
    expect(isRecord("refunded")).toBe(false);
    expect(isRecord(42)).toBe(false);
  });
});

describe("firstString", () => {
  test("5.3g-UNIT-002: returns the first non-blank string", () => {
    expect(firstString("a", "b")).toBe("a");
    expect(firstString(undefined, null, "b")).toBe("b");
  });

  test("5.3g-UNIT-003: skips whitespace-only candidates", () => {
    // A padded field must not become a status that classifies one way and
    // records another.
    expect(firstString("   ", "real")).toBe("real");
    expect(firstString("", "  ", "real")).toBe("real");
  });

  test("5.3g-UNIT-004: returns null when nothing qualifies", () => {
    expect(firstString(null, undefined, "", "   ", 7, {})).toBeNull();
  });

  test("5.3g-UNIT-005: non-string candidates are skipped", () => {
    expect(firstString(299, true, "bank_tran_1")).toBe("bank_tran_1");
  });
});

describe("toRaw", () => {
  test("5.3g-UNIT-006: the body's own status wins over the collapsed fallback", () => {
    const raw = toRaw({ status: "cancelled" }, "pending");

    expect(raw.status).toBe("cancelled");
  });

  test("5.3g-UNIT-007: a body with no status falls back to the collapsed value", () => {
    expect(toRaw({ APIConnect: "DONE" }, "refunded").status).toBe("refunded");
    expect(toRaw({}, "pending").status).toBe("pending");
  });

  test("5.3g-UNIT-008: a blank body status falls back rather than surviving", () => {
    expect(toRaw({ status: "   " }, "pending").status).toBe("pending");
    expect(toRaw({ status: "" }, "refunded").status).toBe("refunded");
  });

  test("5.3g-UNIT-009: a body with neither yields no status at all", () => {
    expect(toRaw({ APIConnect: "DONE" }, undefined).status).toBeUndefined();
    expect(toRaw(null, null).status).toBeUndefined();
  });

  test("5.3g-UNIT-010: every other body field is preserved", () => {
    const raw = toRaw(
      { status: "refunded", refund_ref_id: "ref-1", APIConnect: "DONE" },
      "pending"
    );

    expect(raw.refund_ref_id).toBe("ref-1");
    expect(raw.APIConnect).toBe("DONE");
  });

  test("5.3g-UNIT-011: a non-object body degrades to an empty record", () => {
    expect(toRaw("nonsense", "pending")).toEqual({ status: "pending" });
  });
});

describe("pickRefundId", () => {
  test("5.3g-UNIT-012: the body's refund_ref_id wins", () => {
    expect(
      pickRefundId(
        { refund_ref_id: "from-body" },
        response({ refundId: "from-adapter" })
      )
    ).toBe("from-body");
  });

  test("5.3g-UNIT-013: falls back to the adapter's value", () => {
    expect(pickRefundId({}, response({ refundId: "from-adapter" }))).toBe(
      "from-adapter"
    );
  });

  test("5.3g-UNIT-014: null when the provider issued no id", () => {
    expect(pickRefundId({}, response({ refundId: "" }))).toBeNull();
  });
});

describe("describeThrow", () => {
  test("5.3g-UNIT-015: an Error keeps its message verbatim", () => {
    expect(describeThrow(new Error("SSLCommerz refund failed"))).toBe(
      "SSLCommerz refund failed"
    );
  });

  test("5.3g-UNIT-016: a non-Error is stringified", () => {
    expect(describeThrow("plain string")).toBe("plain string");
    expect(describeThrow(42)).toBe("42");
  });

  test("5.3g-UNIT-017: a value with no usable toString does not throw", () => {
    const hostile = Object.create(null) as object;

    expect(typeof describeThrow(hostile)).toBe("string");
  });
});
