/**
 * Pure normalisation of a payment provider's refund answer.
 *
 * Split out of `refund-provider.ts` so it is importable without `@community/env`
 * or a live gateway: `refund-provider.ts` imports `gateway`, which reaches
 * `@community/env/server`, so a test that imported it could never run. These
 * functions carry the precedence that decides how the provider's own answer is
 * read, which makes them the highest-value thing to cover in this package.
 *
 * Nothing here performs IO.
 */

import type { RefundResponse } from "@foxses/pay";

import type { ProviderRefundRaw } from "./refund-executor";

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * The first candidate that is a non-blank string.
 *
 * Whitespace-only values are rejected rather than passed through: a padded or
 * empty field would otherwise become a `status` that classifies as an unreadable
 * body while being recorded as the provider's own word.
 */
export function firstString(...candidates: unknown[]): string | null {
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate;
    }
  }

  return null;
}

/**
 * Recovers the provider body and guarantees it carries a usable `status`.
 *
 * The adapter collapses its own answer to `"refunded" | "pending"`, so the body
 * is the only place the real outcome survives — it wins whenever it has a
 * `status`. The collapsed field is used solely as a fallback for a body that
 * carries none, which keeps a genuine success from degrading to "unknown".
 */
export function toRaw(
  body: unknown,
  fallbackStatus: unknown
): ProviderRefundRaw {
  const source: ProviderRefundRaw = isRecord(body) ? body : {};
  const status = firstString(source.status, fallbackStatus);

  return status === null ? source : { ...source, status };
}

/** `refund_ref_id` is the handle for later status queries, and the adapter
 *  returns it unconditionally even though the provider omits it on failure. */
export function pickRefundId(
  raw: ProviderRefundRaw,
  response: RefundResponse
): string | null {
  return firstString(raw.refund_ref_id, response.refundId);
}

/**
 * SSLCommerz returns HTTP 200 for every documented outcome, so a thrown error
 * here means transport, auth, or validation — never "refunded". The adapter's
 * message already carries the provider's `errorReason` when there is one; it is
 * kept verbatim so a human can read it, and nothing branches on it.
 */
export function describeThrow(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  try {
    return String(error);
  } catch {
    return "Provider error could not be rendered";
  }
}
