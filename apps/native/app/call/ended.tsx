import { useMutation } from "@tanstack/react-query";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { orpc } from "@/utils/orpc";

const END_REASON_MESSAGES: Record<string, string> = {
  connection_lost: "Call ended — connection lost",
  crash: "Call ended — connection lost",
  explicit: "Call ended — you ended the call",
  disconnect: "Call ended — the call was disconnected.",
  timeout: "Call ended — the call timed out.",
  partner_ended: "Call ended — your partner ended the call",
};

const REPORT_REASONS = [
  { value: "non_participation" as const, label: "Partner didn't participate" },
  { value: "abuse" as const, label: "Abusive behavior" },
  {
    value: "technical_failure" as const,
    label: "Technical issue (no audio/video)",
  },
  { value: "other" as const, label: "Other" },
];

export default function CallEndedScreen() {
  const router = useRouter();
  const { theme } = useUnistyles();
  const { reason, roomName } = useLocalSearchParams<{
    reason?: string;
    roomName?: string;
  }>();
  const [showReportForm, setShowReportForm] = useState(false);
  const [selectedReason, setSelectedReason] = useState<
    (typeof REPORT_REASONS)[number]["value"] | null
  >(null);
  const [reported, setReported] = useState(false);
  const [reportStrikeVoided, setReportStrikeVoided] = useState(false);
  const [details, setDetails] = useState("");

  const reportMutation = useMutation(
    orpc.moderation.reportPartner.mutationOptions()
  );

  const subtitle =
    (reason && END_REASON_MESSAGES[reason]) ?? "The call has ended.";

  const handleBackToLobby = () => {
    router.replace("/call/lobby");
  };

  const handleReportIssue = () => {
    setShowReportForm(true);
  };

  const handleSubmitReport = () => {
    if (!(selectedReason && roomName)) {
      return;
    }
    reportMutation.mutate(
      {
        roomName,
        reason: selectedReason,
        ...(details.trim() ? { details: details.trim() } : {}),
      },
      {
        onSuccess: (data) => {
          setReportStrikeVoided(data.strikeVoided ?? false);
          setReported(true);
          setShowReportForm(false);
        },
      }
    );
  };

  const handleReturnHome = () => {
    router.replace("/");
  };

  const handleCancelReport = () => {
    setShowReportForm(false);
    setSelectedReason(null);
    setDetails("");
  };

  let reportSection: React.ReactNode;
  if (reported) {
    reportSection = (
      <Text
        nativeID="report-thanks"
        style={[styles.thanksText, { color: theme.colors.success }]}
      >
        {reportStrikeVoided
          ? "Report submitted. Your strike has been voided."
          : "Thanks for your report — we'll review it."}
      </Text>
    );
  } else if (showReportForm) {
    reportSection = (
      <View
        nativeID="report-form"
        style={[styles.reportForm, { borderColor: theme.colors.border }]}
      >
        <Text
          style={[styles.reportFormTitle, { color: theme.colors.typography }]}
        >
          What went wrong?
        </Text>

        {REPORT_REASONS.map((r) => (
          <Pressable
            key={r.value}
            nativeID={`report-reason-${r.value}`}
            onPress={() => setSelectedReason(r.value)}
            style={[
              styles.reasonOption,
              {
                backgroundColor:
                  selectedReason === r.value
                    ? theme.colors.primary
                    : theme.colors.muted,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.reasonText,
                {
                  color:
                    selectedReason === r.value
                      ? theme.colors.primaryForeground
                      : theme.colors.typography,
                },
              ]}
            >
              {r.label}
            </Text>
          </Pressable>
        ))}

        <TextInput
          multiline
          nativeID="report-details-input"
          numberOfLines={3}
          onChangeText={setDetails}
          placeholder="Optional details..."
          placeholderTextColor={theme.colors.mutedForeground}
          style={[
            styles.detailsInput,
            {
              color: theme.colors.typography,
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.muted,
            },
          ]}
          value={details}
        />

        <View style={styles.reportActions}>
          <Pressable
            nativeID="cancel-report-button"
            onPress={handleCancelReport}
            style={[
              styles.reportActionBtn,
              { backgroundColor: theme.colors.muted },
            ]}
          >
            <Text
              style={[
                styles.reportActionText,
                { color: theme.colors.mutedForeground },
              ]}
            >
              Cancel
            </Text>
          </Pressable>

          <Pressable
            disabled={!selectedReason || reportMutation.isPending}
            nativeID="submit-report-button"
            onPress={handleSubmitReport}
            style={[
              styles.reportActionBtn,
              {
                backgroundColor: selectedReason
                  ? theme.colors.destructive
                  : theme.colors.muted,
              },
            ]}
          >
            <Text
              style={[
                styles.reportActionText,
                {
                  color: selectedReason
                    ? theme.colors.destructiveForeground
                    : theme.colors.mutedForeground,
                },
              ]}
            >
              {reportMutation.isPending ? "Sending..." : "Submit report"}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  } else {
    reportSection = (
      <Pressable
        nativeID="report-issue-button"
        onPress={handleReportIssue}
        style={[styles.button, { backgroundColor: theme.colors.secondary }]}
      >
        <Text
          style={[
            styles.buttonText,
            { color: theme.colors.secondaryForeground },
          ]}
        >
          Report an issue
        </Text>
      </Pressable>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen options={{ title: "Call Ended" }} />

      <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
        <Text
          nativeID="call-ended-title"
          style={[styles.title, { color: theme.colors.typography }]}
        >
          Call Ended
        </Text>
        <Text
          nativeID="call-ended-reason"
          style={[styles.subtitle, { color: theme.colors.mutedForeground }]}
        >
          {subtitle}
        </Text>

        <View style={styles.ratingSection}>
          <Text
            style={[styles.ratingLabel, { color: theme.colors.typography }]}
          >
            Rate your partner
          </Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Text
                key={star}
                style={[styles.star, { color: theme.colors.muted }]}
              >
                ★
              </Text>
            ))}
          </View>
          <Text
            style={[styles.comingSoon, { color: theme.colors.mutedForeground }]}
          >
            Coming soon
          </Text>
        </View>
      </View>

      <View style={styles.buttonContainer}>
        <Pressable
          nativeID="back-to-lobby-button"
          onPress={handleBackToLobby}
          style={[styles.button, { backgroundColor: theme.colors.primary }]}
        >
          <Text
            style={[
              styles.buttonText,
              { color: theme.colors.primaryForeground },
            ]}
          >
            Rejoin queue
          </Text>
        </Pressable>

        {reportSection}

        {reportMutation.isError && (
          <Text
            nativeID="report-error"
            style={[styles.errorMsg, { color: theme.colors.destructive }]}
          >
            Failed to submit report. Please try again.
          </Text>
        )}

        <Pressable
          nativeID="return-home-button"
          onPress={handleReturnHome}
          style={[styles.button, { backgroundColor: theme.colors.secondary }]}
        >
          <Text
            style={[
              styles.buttonText,
              { color: theme.colors.secondaryForeground },
            ]}
          >
            Return home
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 24,
  },
  card: {
    width: "100%",
    padding: 24,
    borderRadius: 16,
    alignItems: "center",
    gap: 16,
  },
  title: {
    fontSize: theme.fontSize["2xl"],
    fontWeight: "700",
  },
  subtitle: {
    fontSize: theme.fontSize.base,
    textAlign: "center",
  },
  ratingSection: {
    marginTop: 16,
    alignItems: "center",
    gap: 8,
  },
  ratingLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: "600",
  },
  starsRow: {
    flexDirection: "row",
    gap: 4,
  },
  star: {
    fontSize: theme.fontSize["2xl"],
  },
  comingSoon: {
    fontSize: theme.fontSize.xs,
  },
  buttonContainer: {
    width: "100%",
    gap: 12,
  },
  button: {
    width: "100%",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    fontSize: theme.fontSize.base,
    fontWeight: "600",
  },
  thanksText: {
    fontSize: theme.fontSize.sm,
    textAlign: "center",
    paddingVertical: 8,
  },
  reportForm: {
    width: "100%",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  reportFormTitle: {
    fontSize: theme.fontSize.base,
    fontWeight: "600",
    marginBottom: 4,
  },
  reasonOption: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
  },
  reasonText: {
    fontSize: theme.fontSize.sm,
    fontWeight: "500",
  },
  reportActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  reportActionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  reportActionText: {
    fontSize: theme.fontSize.sm,
    fontWeight: "600",
  },
  detailsInput: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: theme.fontSize.sm,
    minHeight: 60,
    textAlignVertical: "top",
  },
  errorMsg: {
    fontSize: theme.fontSize.sm,
    textAlign: "center",
  },
}));
