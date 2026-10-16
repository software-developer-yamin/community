import type { SubscriptionDetail } from "@community/api/types/subscription";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { orpc, queryClient } from "@/utils/orpc";

type Status = SubscriptionDetail["status"];

const STATUS_LABEL: Record<Status, string> = {
  active: "Active",
  cancelled: "Cancelled",
  expired: "Expired",
  refunded: "Refunded",
  free: "Free",
};

interface Plan {
  description: string;
  features: string[];
  id: "free" | "premium" | "premium_plus";
  name: string;
  period: string;
  popular?: boolean;
  price: string;
}

const AVAILABLE_PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    price: "৳0",
    period: "forever",
    description: "Basic practice with daily limits",
    features: [
      "15 minutes daily 1:1 speaking",
      "Standard audio connection",
      "Community room access (listener)",
    ],
  },
  {
    id: "premium",
    name: "Premium",
    price: "৳299",
    period: "month",
    description: "Unlimited speaking practice & AI coaching",
    popular: true,
    features: [
      "Unlimited 1:1 speaking practice",
      "AI Speaking test with deep analysis",
      "Priority queue matching",
      "Speaking streak protection",
    ],
  },
  {
    id: "premium_plus",
    name: "Premium Plus",
    price: "৳499",
    period: "month",
    description: "For serious learners & future leaders",
    features: [
      "Everything in Premium",
      "20% off all Trainer marketplace classes",
      "Host exclusive voice rooms",
      "Advanced CEFR progress analytics",
    ],
  },
];

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
  const router = useRouter();
  const { data, isLoading, error, refetch } = useQuery(
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
          <EmptyState
            actionLabel="Try again"
            body="We could not load your subscription. Check your connection and try again."
            emoji="📡"
            onAction={() => refetch()}
            title="Could not load subscription"
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Go back"
          accessibilityRole="button"
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons
            color={theme.colors.foreground}
            name="chevron-back"
            size={24}
          />
        </Pressable>
        <Text style={styles.headerTitle}>Subscription</Text>
        <View style={styles.headerRightPlaceholder} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
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

          {data.status === "active" || data.status === "cancelled" ? (
            <Button
              onPress={() => router.push("/(app)/refund/request")}
              size="md"
              variant="secondary"
            >
              Request refund
            </Button>
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

        <View style={styles.plansSection}>
          <Text style={styles.sectionTitle}>Available Plans</Text>
          <Text style={styles.sectionSubtitle}>
            Upgrade or switch plans to unlock unlimited conversation and AI
            coaching
          </Text>

          <View style={styles.plansList}>
            {AVAILABLE_PLANS.map((plan) => {
              const isCurrent = data.tier === plan.id;
              return (
                <Card
                  key={plan.id}
                  style={
                    plan.popular
                      ? [styles.planCard, styles.planCardPopular]
                      : styles.planCard
                  }
                >
                  {plan.popular ? (
                    <View style={styles.popularBadge}>
                      <Text style={styles.popularBadgeText}>Most Popular</Text>
                    </View>
                  ) : null}

                  <View style={styles.planHeader}>
                    <Text style={styles.planName}>{plan.name}</Text>
                    <View style={styles.planPriceRow}>
                      <Text style={styles.planPrice}>{plan.price}</Text>
                      <Text style={styles.planPeriod}>/{plan.period}</Text>
                    </View>
                  </View>

                  <Text style={styles.planDesc}>{plan.description}</Text>

                  <View style={styles.featuresList}>
                    {plan.features.map((feat) => (
                      <View key={feat} style={styles.featureRow}>
                        <Ionicons
                          color={theme.colors.success}
                          name="checkmark-circle"
                          size={16}
                        />
                        <Text style={styles.featureText}>{feat}</Text>
                      </View>
                    ))}
                  </View>

                  {isCurrent ? (
                    <Button disabled size="md" variant="secondary">
                      Current Plan
                    </Button>
                  ) : (
                    <Button
                      onPress={() =>
                        Alert.alert(
                          `Upgrade to ${plan.name}`,
                          `Payment checkout for ${plan.name} at ${plan.price}/${plan.period}.`
                        )
                      }
                      size="md"
                      variant={plan.popular ? "primary" : "secondary"}
                    >
                      {plan.id === "free"
                        ? "Downgrade"
                        : `Upgrade to ${plan.name}`}
                    </Button>
                  )}
                </Card>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create((theme, rt) => ({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: rt.insets.top + theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    padding: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
  },
  headerTitle: {
    fontFamily: theme.fontFamily.bodyStrong,
    fontSize: theme.fontSize.lg,
    color: theme.colors.foreground,
  },
  headerRightPlaceholder: {
    width: 32,
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
  plansSection: {
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  sectionTitle: {
    fontFamily: theme.fontFamily.display,
    fontSize: theme.fontSize.xl,
    color: theme.colors.foreground,
  },
  sectionSubtitle: {
    fontFamily: theme.fontFamily.body,
    fontSize: theme.fontSize.sm,
    color: theme.colors.mutedForeground,
    marginBottom: theme.spacing.xs,
  },
  plansList: {
    gap: theme.spacing.md,
  },
  planCard: {
    gap: theme.spacing.sm,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    position: "relative",
  },
  planCardPopular: {
    borderColor: theme.colors.primary,
    borderWidth: 2,
  },
  popularBadge: {
    position: "absolute",
    top: -10,
    right: 16,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.full,
  },
  popularBadgeText: {
    fontFamily: theme.fontFamily.caption,
    fontSize: theme.fontSize.xs,
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  planHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  planName: {
    fontFamily: theme.fontFamily.bodyStrong,
    fontSize: theme.fontSize.lg,
    color: theme.colors.foreground,
  },
  planPriceRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  planPrice: {
    fontFamily: theme.fontFamily.display,
    fontSize: theme.fontSize["2xl"],
    color: theme.colors.foreground,
  },
  planPeriod: {
    fontFamily: theme.fontFamily.body,
    fontSize: theme.fontSize.xs,
    color: theme.colors.mutedForeground,
  },
  planDesc: {
    fontFamily: theme.fontFamily.body,
    fontSize: theme.fontSize.sm,
    color: theme.colors.mutedForeground,
  },
  featuresList: {
    gap: theme.spacing.xs,
    marginVertical: theme.spacing.xs,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
  },
  featureText: {
    fontFamily: theme.fontFamily.body,
    fontSize: theme.fontSize.sm,
    color: theme.colors.foreground,
  },
}));
