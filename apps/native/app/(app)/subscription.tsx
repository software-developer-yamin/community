import type { SubscriptionDetail } from "@community/api/types/subscription";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Switch,
  Text,
  View,
} from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { Card } from "@/components/ui/card";
import { orpc, queryClient } from "@/utils/orpc";

type Status = SubscriptionDetail["status"];

const STATUS_LABEL: Record<Status, string> = {
  active: "Active",
  cancelled: "Cancelled",
  expired: "Expired",
  refunded: "Refunded",
  free: "Free",
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
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

export default function SubscriptionScreen() {
  const { theme } = useUnistyles();
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
      <View style={styles.root}>
        <View style={styles.centered}>
          <ActivityIndicator color={theme.colors.primary} size="large" />
        </View>
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={styles.root}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>
            Unable to load subscription information.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <LinearGradient
          colors={
            data.status === "active"
              ? theme.gradients.pro
              : theme.gradients.practice
          }
          end={{ x: 1, y: 1 }}
          start={{ x: 0, y: 0 }}
          style={styles.heroBand}
        >
          <View style={styles.heroIconWrap}>
            <Ionicons color="#FFFFFF" name="ribbon" size={26} />
          </View>
          <Text style={styles.heroTier}>{formatTier(data.tier)}</Text>
          <Text style={styles.heroStatus}>{STATUS_LABEL[data.status]}</Text>
        </LinearGradient>

        <Card style={styles.detailsCard}>
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
                trackColor={{
                  false: theme.colors.border,
                  true: theme.colors.success,
                }}
                value={data.autoRenew}
              />
            </View>
          ) : null}

          {data.status === "cancelled" ? (
            <View style={styles.cancelledBanner}>
              <Ionicons
                color={theme.colors.warning}
                name="information-circle"
                size={18}
              />
              <Text style={styles.cancelledBannerText}>
                Your subscription has been cancelled. You retain access until
                the end of the current billing period.
              </Text>
            </View>
          ) : null}
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create((theme, rt) => ({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: theme.spacing.lg,
    paddingBottom: rt.insets.bottom + theme.spacing.xl,
    gap: theme.spacing.lg,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing.lg,
  },
  errorText: {
    color: theme.colors.destructive,
    fontFamily: theme.fontFamily.body,
    fontSize: theme.fontSize.base,
  },
  heroBand: {
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    gap: theme.spacing.xs,
    alignItems: "flex-start",
  },
  heroIconWrap: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.full,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing.xs,
  },
  heroTier: {
    fontFamily: theme.fontFamily.display,
    fontSize: theme.fontSize["2xl"],
    color: "#4A3306",
  },
  heroStatus: {
    fontFamily: theme.fontFamily.bodyStrong,
    fontSize: theme.fontSize.sm,
    color: "#4A3306",
  },
  detailsCard: {
    gap: theme.spacing.md,
  },
  description: {
    fontFamily: theme.fontFamily.body,
    fontSize: theme.fontSize.sm,
    color: theme.colors.foreground,
  },
  detailRows: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.sm,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: theme.spacing.sm,
  },
  detailLabel: {
    fontFamily: theme.fontFamily.body,
    fontSize: theme.fontSize.sm,
    color: theme.colors.mutedForeground,
  },
  detailValue: {
    fontFamily: theme.fontFamily.bodyStrong,
    fontSize: theme.fontSize.sm,
    color: theme.colors.foreground,
  },
  autoRenewRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: theme.colors.accent,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
  },
  autoRenewLabel: {
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  autoRenewTitle: {
    fontFamily: theme.fontFamily.bodyStrong,
    fontSize: theme.fontSize.sm,
    color: theme.colors.foreground,
  },
  autoRenewDesc: {
    fontFamily: theme.fontFamily.caption,
    fontSize: theme.fontSize.xs,
    color: theme.colors.mutedForeground,
    marginTop: 2,
  },
  cancelledBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.warningSurface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
  },
  cancelledBannerText: {
    flex: 1,
    fontFamily: theme.fontFamily.body,
    fontSize: theme.fontSize.sm,
    color: theme.colors.foreground,
  },
}));
