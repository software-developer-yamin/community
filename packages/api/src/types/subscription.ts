export interface SubscriptionDetail {
  amount: number | null;
  autoRenew: boolean;
  autoRenewDisabledAt: string | null;
  currency: string | null;
  endsAt: string | null;
  id: string;
  isCancelled: boolean;
  nextBillingDate: string | null;
  paymentMethodLastFour: string | null;
  provider: string | null;
  readableDescription: string;
  readableLabel: string;
  startedAt: string | null;
  status: "active" | "cancelled" | "expired" | "refunded" | "free";
  tier: "free" | "premium" | "premium_plus";
  tierExpiresAt: string | null;
  willExpireOn: string | null;
}
