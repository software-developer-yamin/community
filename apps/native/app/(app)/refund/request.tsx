import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { Container } from "@/components/container";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { TextField } from "@/components/ui/text-field";
import { orpc } from "@/utils/orpc";

function formatPrice(amount: number, currency: string | null): string {
  if (currency === "BDT") {
    return `৳${amount}`;
  }
  if (currency === "USD") {
    return `$${amount}`;
  }
  return `${amount} ${currency ?? ""}`.trim();
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

export default function RefundRequestScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [reason, setReason] = useState("");

  const { data: subscription, isLoading } = useQuery(
    orpc.rebuild.getSubscription.queryOptions()
  );

  const submit = useMutation(
    orpc.refund.requestRefund.mutationOptions({
      onSuccess: (result) => {
        queryClient.invalidateQueries({
          queryKey: orpc.refund.getRefundStatus.key(),
        });
        router.replace({
          pathname: "/(app)/refund/[id]",
          params: { id: result.id },
        });
      },
    })
  );

  const handleSubmit = useCallback(() => {
    const trimmed = reason.trim();
    submit.mutate(trimmed ? { reason: trimmed } : {});
  }, [reason, submit.mutate]);

  if (isLoading) {
    return (
      <Container>
        <View style={styles.centered}>
          <ActivityIndicator size="large" />
        </View>
      </Container>
    );
  }

  const hasPaidPlan =
    subscription?.status === "active" || subscription?.status === "cancelled";

  if (!hasPaidPlan) {
    return (
      <Container>
        <View style={styles.centered}>
          <EmptyState
            body="Refunds are available on paid plans. Free accounts have nothing to refund."
            emoji="💳"
            title="No paid plan"
          />
        </View>
      </Container>
    );
  }

  const amount = subscription.amount;
  const currency = subscription.currency;

  return (
    <Container>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.lede}>
          If the app did not work for you, request a refund. We check every
          request against the same rules, so the answer is usually immediate.
        </Text>

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Your purchase</Text>
          <View style={styles.rows}>
            {amount === null ? null : (
              <DetailRow
                label="Amount paid"
                value={formatPrice(amount, currency)}
              />
            )}
            {subscription.startedAt ? (
              <DetailRow
                label="Purchased"
                value={new Date(subscription.startedAt).toLocaleDateString()}
              />
            ) : null}
            {subscription.endsAt ? (
              <DetailRow
                label={subscription.autoRenew ? "Renews" : "Ends"}
                value={new Date(subscription.endsAt).toLocaleDateString()}
              />
            ) : null}
          </View>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>What went wrong?</Text>
          <Text style={styles.helper}>
            Optional, but it helps us process refunds faster.
          </Text>
          <TextField
            autoCapitalize="sentences"
            label="Tell us more"
            onChangeText={setReason}
            placeholder="The app crashed every time I tried to join a call…"
            value={reason}
          />
        </Card>

        {submit.error ? (
          <Text style={styles.errorText}>
            {submit.error.message ??
              "We could not submit your request. Please try again."}
          </Text>
        ) : null}

        <Button
          disabled={submit.isPending}
          loading={submit.isPending}
          onPress={handleSubmit}
        >
          {submit.isPending ? "Submitting…" : "Request refund"}
        </Button>
      </ScrollView>
    </Container>
  );
}

const styles = StyleSheet.create((theme, rt) => ({
  scrollContent: {
    padding: theme.spacing.lg,
    paddingBottom: rt.insets.bottom + theme.spacing.xl,
    gap: theme.spacing.lg,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    padding: theme.spacing.lg,
  },
  lede: {
    fontFamily: theme.fontFamily.body,
    fontSize: theme.fontSize.base,
    lineHeight: 22,
    color: theme.colors.mutedForeground,
  },
  card: {
    gap: theme.spacing.sm,
  },
  cardTitle: {
    fontFamily: theme.fontFamily.bodyStrong,
    fontSize: theme.fontSize.base,
    color: theme.colors.foreground,
  },
  helper: {
    fontFamily: theme.fontFamily.caption,
    fontSize: theme.fontSize.xs,
    color: theme.colors.mutedForeground,
  },
  rows: {
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
  errorText: {
    fontFamily: theme.fontFamily.body,
    fontSize: theme.fontSize.sm,
    color: theme.colors.destructive,
  },
}));
