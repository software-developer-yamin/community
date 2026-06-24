"use client";

import type { SubscriptionDetail } from "@community/api/types/subscription";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@community/ui/components/card";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { orpc, queryClient } from "@/utils/orpc";

const STATUS_STYLES: Record<
  string,
  { badge: string; icon: string; bg: string }
> = {
  active: {
    badge: "bg-green-500/10 text-green-600",
    icon: "●",
    bg: "border-green-200",
  },
  cancelled: {
    badge: "bg-yellow-500/10 text-yellow-600",
    icon: "○",
    bg: "border-yellow-200",
  },
  expired: {
    badge: "bg-red-500/10 text-red-600",
    icon: "○",
    bg: "border-red-200",
  },
  refunded: {
    badge: "bg-red-500/10 text-red-600",
    icon: "○",
    bg: "border-red-200",
  },
  free: {
    badge: "bg-blue-500/10 text-blue-600",
    icon: "◇",
    bg: "border-blue-200",
  },
};

function formatTier(tier: SubscriptionDetail["tier"]): string {
  if (tier === "premium") {
    return "Premium Plan";
  }
  if (tier === "premium_plus") {
    return "Premium Plus Plan";
  }
  return "Free Plan";
}

function formatPrice(amount: number, currency: string | null): string {
  if (currency === "BDT") {
    return `৳${amount}`;
  }
  if (currency === "USD") {
    return `$${amount}`;
  }
  return `${amount} ${currency}`;
}

function CardDetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function AutoRenewToggle({
  autoRenew,
  disabled,
  onToggle,
}: {
  autoRenew: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between rounded border bg-muted/30 px-3 py-2">
      <div>
        <p className="font-medium text-sm">Auto-renew</p>
        <p className="text-muted-foreground text-xs">
          {autoRenew
            ? "Your plan will renew automatically"
            : "Your plan will not renew"}
        </p>
      </div>
      <button
        aria-checked={autoRenew}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 ${
          autoRenew ? "bg-green-500" : "bg-gray-300"
        }`}
        data-testid="auto-renew-toggle"
        disabled={disabled}
        onClick={onToggle}
        role="switch"
        type="button"
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            autoRenew ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

function CancelledBanner() {
  return (
    <div className="rounded border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm text-yellow-800">
      Your subscription has been cancelled. You retain access until the end of
      the current billing period.
    </div>
  );
}

function DetailRows({ data }: { data: SubscriptionDetail }) {
  const rows: Array<{ label: string; value: string } | null> = [
    data.startedAt
      ? {
          label: "Started",
          value: new Date(data.startedAt).toLocaleDateString(),
        }
      : null,
    data.endsAt
      ? {
          label: data.autoRenew ? "Renews" : "Ends",
          value: new Date(data.endsAt).toLocaleDateString(),
        }
      : null,
    data.amount !== null && data.currency
      ? { label: "Price", value: formatPrice(data.amount, data.currency) }
      : null,
    data.nextBillingDate
      ? {
          label: "Next billing",
          value: new Date(data.nextBillingDate).toLocaleDateString(),
        }
      : null,
    data.paymentMethodLastFour
      ? {
          label: "Card",
          value: `•••• ${data.paymentMethodLastFour}`,
        }
      : null,
  ];

  return (
    <dl className="space-y-2 text-sm">
      {rows.map(
        (row) =>
          row && (
            <CardDetailRow
              key={row.label}
              label={row.label}
              value={row.value}
            />
          )
      )}
    </dl>
  );
}

export default function SubscriptionCard() {
  const { data, isLoading, error } = useQuery(
    orpc.rebuild.getSubscription.queryOptions()
  );

  const { mutateAsync: toggleAutoRenew, isPending: isToggling } = useMutation(
    orpc.rebuild.toggleAutoRenew.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: orpc.rebuild.getSubscription.key(),
        });
        toast.success("Auto-renew setting updated");
      },
      onError: (err) => {
        toast.error(err.message);
      },
    })
  );

  if (isLoading) {
    return (
      <Card data-testid="subscription-card">
        <CardHeader>
          <CardTitle>Subscription</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card data-testid="subscription-card">
        <CardHeader>
          <CardTitle>Subscription</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Unable to load subscription information.
          </p>
        </CardContent>
      </Card>
    );
  }

  const styles = STATUS_STYLES[data.status] ?? STATUS_STYLES.free;

  const handleToggleAutoRenew = async () => {
    try {
      await toggleAutoRenew(undefined);
    } catch {
      // Error handled by mutation onError
    }
  };

  return (
    <Card className={`border-l-4 ${styles.bg}`} data-testid="subscription-card">
      <CardHeader>
        <CardTitle>Subscription</CardTitle>
        <CardDescription>{formatTier(data.tier)}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-semibold text-xs ${styles.badge}`}
            data-testid="subscription-status-badge"
          >
            <span>{styles.icon}</span>
            {data.readableLabel}
          </span>
        </div>

        <p className="text-sm">{data.readableDescription}</p>

        <DetailRows data={data} />

        {data.status === "active" && (
          <AutoRenewToggle
            autoRenew={data.autoRenew}
            disabled={isToggling}
            onToggle={handleToggleAutoRenew}
          />
        )}

        {data.status === "cancelled" && <CancelledBanner />}
      </CardContent>
    </Card>
  );
}
