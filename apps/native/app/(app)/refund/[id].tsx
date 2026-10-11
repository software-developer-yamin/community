import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useGlobalSearchParams } from "expo-router";
import { useCallback } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { Container } from "@/components/container";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { orpc } from "@/utils/orpc";

type Status =
  | "pending"
  | "auto_approved"
  | "auto_denied"
  | "human_review"
  | "approved"
  | "denied"
  | "processing"
  | "completed";

type StatusIcon = "checkmark-circle" | "close-circle" | "time";

interface StatusView {
  badgeBg: string;
  badgeText: string;
  headline: string;
  icon: StatusIcon;
}

const DECLINED: Status[] = ["auto_denied", "denied"];
const IN_REVIEW: Status[] = ["pending", "human_review"];

const STATUS_VIEW: Record<Status, StatusView> = {
  pending: {
    badgeBg: "#F5A62320",
    badgeText: "#F5A623",
    headline: "Under review",
    icon: "time",
  },
  auto_approved: {
    badgeBg: "#22C55E20",
    badgeText: "#22C55E",
    headline: "Refund approved",
    icon: "checkmark-circle",
  },
  auto_denied: {
    badgeBg: "#E23D4220",
    badgeText: "#E23D42",
    headline: "Refund not eligible",
    icon: "close-circle",
  },
  human_review: {
    badgeBg: "#F5A62320",
    badgeText: "#F5A623",
    headline: "Under review",
    icon: "time",
  },
  approved: {
    badgeBg: "#22C55E20",
    badgeText: "#22C55E",
    headline: "Refund approved",
    icon: "checkmark-circle",
  },
  denied: {
    badgeBg: "#E23D4220",
    badgeText: "#E23D42",
    headline: "Refund not eligible",
    icon: "close-circle",
  },
  processing: {
    badgeBg: "#3B82F620",
    badgeText: "#3B82F6",
    headline: "Processing with payment provider",
    icon: "time",
  },
  completed: {
    badgeBg: "#22C55E20",
    badgeText: "#22C55E",
    headline: "Refund complete",
    icon: "checkmark-circle",
  },
};

const PROCESSING_BODY =
  "Your refund is approved and moving through the payment provider. Banks typically settle this in 5–7 working days.";

const REVIEW_BODY =
  "A person is reviewing your request. We answer every refund within 7 days.";

const FALLBACK_BODY = "Your refund request has been updated.";

function resolveBody(status: Status, reason: string | null): string {
  if (status === "processing") {
    return PROCESSING_BODY;
  }
  if (IN_REVIEW.includes(status)) {
    return REVIEW_BODY;
  }
  return reason ?? FALLBACK_BODY;
}

function formatPrice(amount: number | null): string {
  if (amount === null) {
    return "—";
  }
  return `৳${amount}`;
}

export default function RefundStatusScreen() {
  const { id } = useGlobalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery(
    orpc.refund.getRefundStatus.queryOptions({ input: { refundId: id } })
  );

  const appeal = useMutation(
    orpc.refund.appealRefund.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: orpc.refund.getRefundStatus.key(),
        });
      },
    })
  );

  const handleAppeal = useCallback(() => {
    appeal.mutate({ refundId: id });
  }, [appeal.mutate, id]);

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
          <EmptyState
            body="We could not find that refund request."
            emoji="🔍"
            title="Request not found"
          />
        </View>
      </Container>
    );
  }

  const status = data.status as Status;
  const view = STATUS_VIEW[status];
  const isDeclined = DECLINED.includes(status);
  const reason = isDeclined ? data.denialReason : data.approvalReason;

  return (
    <Container>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.badge, { backgroundColor: view.badgeBg }]}>
          <Ionicons color={view.badgeText} name={view.icon} size={14} />
          <Text style={[styles.badgeText, { color: view.badgeText }]}>
            {view.headline}
          </Text>
        </View>

        <Text style={styles.lede}>{resolveBody(status, reason)}</Text>

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Details</Text>
          <View style={styles.rows}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Amount</Text>
              <Text style={styles.detailValue}>
                {formatPrice(data.refundAmount)}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Requested</Text>
              <Text style={styles.detailValue}>
                {new Date(data.createdAt).toLocaleDateString()}
              </Text>
            </View>
            {data.slaDeadline ? (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Decision by</Text>
                <Text style={styles.detailValue}>
                  {new Date(data.slaDeadline).toLocaleDateString()}
                </Text>
              </View>
            ) : null}
            {data.providerRefundStatus ? (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Provider</Text>
                <Text style={styles.detailValue}>
                  {data.providerRefundStatus}
                </Text>
              </View>
            ) : null}
          </View>
        </Card>

        {isDeclined ? (
          <>
            {appeal.error ? (
              <Text style={styles.errorText}>
                {appeal.error.message ??
                  "We could not submit your appeal. Please try again."}
              </Text>
            ) : null}
            <Button
              disabled={appeal.isPending}
              loading={appeal.isPending}
              onPress={handleAppeal}
              variant="secondary"
            >
              {appeal.isPending ? "Sending…" : "Ask a human to review"}
            </Button>
          </>
        ) : null}
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
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  badgeText: {
    fontFamily: theme.fontFamily.bodyStrong,
    fontSize: theme.fontSize.sm,
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
