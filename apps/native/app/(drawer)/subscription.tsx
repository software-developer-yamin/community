import type { SubscriptionDetail } from "@community/api/types/subscription";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Switch,
  Text,
  View,
} from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { Container } from "@/components/container";
import { orpc, queryClient } from "@/utils/orpc";

const STATUS_CONFIG: Record<
  string,
  { badgeBg: string; badgeText: string; borderColor: string; icon: string }
> = {
  active: {
    badgeBg: "#22C55E20",
    badgeText: "#22C55E",
    borderColor: "#22C55E",
    icon: "●",
  },
  cancelled: {
    badgeBg: "#F59E0B20",
    badgeText: "#F59E0B",
    borderColor: "#F59E0B",
    icon: "○",
  },
  expired: {
    badgeBg: "#EF444420",
    badgeText: "#EF4444",
    borderColor: "#EF4444",
    icon: "○",
  },
  refunded: {
    badgeBg: "#EF444420",
    badgeText: "#EF4444",
    borderColor: "#EF4444",
    icon: "○",
  },
  free: {
    badgeBg: "#3B82F620",
    badgeText: "#3B82F6",
    borderColor: "#3B82F6",
    icon: "◇",
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

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={detailStyles.row}>
      <Text style={detailStyles.label}>{label}</Text>
      <Text style={detailStyles.value}>{value}</Text>
    </View>
  );
}

const detailStyles = StyleSheet.create((theme) => ({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: theme.spacing.sm,
  },
  label: {
    color: theme.colors.mutedForeground,
    fontSize: theme.fontSize.sm,
  },
  value: {
    color: theme.colors.typography,
    fontSize: theme.fontSize.sm,
  },
}));

export default function SubscriptionScreen() {
  const { data, isLoading, error } = useQuery(
    orpc.rebuild.getSubscription.queryOptions()
  );

  const { mutateAsync: toggleAutoRenew, isPending: isToggling } = useMutation(
    orpc.rebuild.toggleAutoRenew.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: orpc.rebuild.getSubscription.key(),
        });
        Alert.alert("Success", "Auto-renew setting updated");
      },
      onError: (err) => {
        Alert.alert("Error", err.message);
      },
    })
  );

  const handleToggleAutoRenew = useCallback(() => {
    toggleAutoRenew(undefined);
  }, [toggleAutoRenew]);

  if (isLoading) {
    return (
      <Container>
        <View style={styles.centered}>
          <ActivityIndicator size="large" />
        </View>
      </Container>
    );
  }

  if (error || !data) {
    return (
      <Container>
        <View style={styles.centered}>
          <Text style={styles.errorText}>
            Unable to load subscription information.
          </Text>
        </View>
      </Container>
    );
  }

  const config = STATUS_CONFIG[data.status] ?? STATUS_CONFIG.free;

  return (
    <Container>
      <ScrollView>
        <View style={styles.page}>
          <View
            style={[
              styles.card,
              { borderLeftWidth: 4, borderLeftColor: config.borderColor },
            ]}
          >
            <Text style={styles.cardTitle}>Subscription</Text>
            <Text style={styles.cardSubtitle}>{formatTier(data.tier)}</Text>

            <View style={styles.statusRow}>
              <View style={[styles.badge, { backgroundColor: config.badgeBg }]}>
                <Text style={[styles.badgeText, { color: config.badgeText }]}>
                  {config.icon} {data.readableLabel}
                </Text>
              </View>
            </View>

            <Text style={styles.description}>{data.readableDescription}</Text>

            <View style={styles.detailRows}>
              {data.startedAt ? (
                <DetailRow
                  label="Started"
                  value={new Date(data.startedAt).toLocaleDateString()}
                />
              ) : null}
              {data.endsAt ? (
                <DetailRow
                  label={data.autoRenew ? "Renews" : "Ends"}
                  value={new Date(data.endsAt).toLocaleDateString()}
                />
              ) : null}
              {data.amount !== null && data.currency ? (
                <DetailRow
                  label="Price"
                  value={formatPrice(data.amount, data.currency)}
                />
              ) : null}
              {data.nextBillingDate ? (
                <DetailRow
                  label="Next billing"
                  value={new Date(data.nextBillingDate).toLocaleDateString()}
                />
              ) : null}
              {data.paymentMethodLastFour ? (
                <DetailRow
                  label="Card"
                  value={`•••• ${data.paymentMethodLastFour}`}
                />
              ) : null}
            </View>

            {data.status === "active" ? (
              <View style={styles.autoRenewRow}>
                <View style={styles.autoRenewLabel}>
                  <Text style={styles.autoRenewTitle}>Auto-renew</Text>
                  <Text style={styles.autoRenewDesc}>
                    {data.autoRenew
                      ? "Your plan will renew automatically"
                      : "Your plan will not renew"}
                  </Text>
                </View>
                <Switch
                  disabled={isToggling}
                  onValueChange={handleToggleAutoRenew}
                  trackColor={{ false: "#d1d5db", true: "#22C55E" }}
                  value={data.autoRenew}
                />
              </View>
            ) : null}

            {data.status === "cancelled" ? (
              <View style={styles.cancelledBanner}>
                <Text style={styles.cancelledBannerText}>
                  Your subscription has been cancelled. You retain access until
                  the end of the current billing period.
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </ScrollView>
    </Container>
  );
}

const styles = StyleSheet.create((theme) => ({
  page: {
    padding: theme.spacing.md,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing.lg,
  },
  errorText: {
    color: theme.colors.destructive,
    fontSize: theme.fontSize.base,
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  cardTitle: {
    color: theme.colors.typography,
    fontSize: theme.fontSize.xl,
    fontWeight: "bold",
  },
  cardSubtitle: {
    color: theme.colors.mutedForeground,
    fontSize: theme.fontSize.sm,
    marginTop: -theme.spacing.sm,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  badge: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: 9999,
  },
  badgeText: {
    fontSize: theme.fontSize.xs,
    fontWeight: "600",
  },
  description: {
    color: theme.colors.typography,
    fontSize: theme.fontSize.sm,
  },
  detailRows: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.sm,
  },
  autoRenewRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: theme.colors.muted,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
  },
  autoRenewLabel: {
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  autoRenewTitle: {
    color: theme.colors.typography,
    fontSize: theme.fontSize.sm,
    fontWeight: "600",
  },
  autoRenewDesc: {
    color: theme.colors.mutedForeground,
    fontSize: theme.fontSize.xs,
    marginTop: 2,
  },
  cancelledBanner: {
    backgroundColor: "#FEF3C7",
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
  },
  cancelledBannerText: {
    color: "#92400E",
    fontSize: theme.fontSize.sm,
  },
}));
