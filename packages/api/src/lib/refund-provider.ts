/**
 * The single gateway call site for refunds.
 *
 * Every other module that talks to a payment provider goes through `gateway`,
 * and so does this one — but only here, so the transport can be swapped without
 * the decision logic noticing. Nothing in this file decides anything: the
 * normalising helpers live in `refund-provider-normalize.ts`, which is
 * importable without `@community/env` and therefore unit-testable.
 */

import type { RefundResponse, SupportedProvider } from "@foxses/pay";

import { gateway } from "./payment";
import type { ProviderRefundRaw } from "./refund-executor";
import {
  describeThrow,
  pickRefundId,
  toRaw,
} from "./refund-provider-normalize";

export interface SendRefundInput {
  /** Major units. A ৳299 charge is `299`, never `29900`, and never divided. */
  amount: number;
  /** `bank_tran_id` of the original charge — not `tran_id`, which the gateway
   *  rejects for refunds. */
  bankTranId: string;
  provider: SupportedProvider;
  reason: string;
}

export type SendRefundResult =
  | {
      ok: true;
      /** The provider's own body, with the true business `status` restored. */
      raw: ProviderRefundRaw;
      /** `refund_ref_id` when the provider issued one. Absent on failure. */
      refundId: string | null;
      response: RefundResponse;
    }
  | {
      ok: false;
      /** Recorded verbatim for human triage. Never branched on. */
      errorReason: string;
      error: unknown;
    };

/**
 * Initiates one provider refund.
 *
 * Never throws: the caller must be able to record the attempt and its outcome
 * either way, because the attempt budget is what keeps a retry from becoming a
 * second real refund.
 */
export async function sendRefundToProvider({
  bankTranId,
  amount,
  reason,
  provider,
}: SendRefundInput): Promise<SendRefundResult> {
  try {
    const response = await gateway.refundPayment(provider, {
      transactionId: bankTranId,
      amount,
      reason,
    });

    const raw = toRaw(response.raw, response.status);

    return { ok: true, raw, refundId: pickRefundId(raw, response), response };
  } catch (error) {
    return { ok: false, errorReason: describeThrow(error), error };
  }
}
