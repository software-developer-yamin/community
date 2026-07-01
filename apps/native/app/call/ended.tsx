import { type UseMutationResult, useMutation } from "@tanstack/react-query";
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

// ── Sub-components ──────────────────────────────────────────────────────

interface RatingFormProps {
  mutation: UseMutationResult<
    { success: boolean; alreadyRated: boolean },
    Error,
    {
      roomName: string;
      stars: number;
      helpedPractice: boolean;
      comment?: string;
    },
    unknown
  >;
  onDismissed: () => void;
  onSubmitted: () => void;
  roomName: string;
}

function RatingForm({
  roomName,
  mutation,
  onSubmitted,
  onDismissed,
}: RatingFormProps) {
  const { theme } = useUnistyles();
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [helped, setHelped] = useState<boolean | null>(null);

  const handleSubmit = () => {
    if (!(stars > 0)) {
      return;
    }
    mutation.mutate(
      {
        roomName,
        stars,
        helpedPractice: helped ?? false,
        ...(comment.trim() ? { comment: comment.trim() } : {}),
      },
      { onSuccess: onSubmitted }
    );
  };

  return (
    <View
      nativeID="rating-form"
      style={[styles.ratingForm, { borderColor: theme.colors.border }]}
    >
      <Text
        style={[styles.ratingFormTitle, { color: theme.colors.typography }]}
      >
        Rate your partner
      </Text>

      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Pressable
            key={star}
            nativeID={`star-${star}`}
            onPress={() => setStars(star)}
            style={styles.starPressable}
          >
            <Text
              style={[
                styles.star,
                {
                  color:
                    star <= stars ? theme.colors.warning : theme.colors.muted,
                },
              ]}
            >
              ★
            </Text>
          </Pressable>
        ))}
      </View>

      <Text
        style={[styles.ratingQuestion, { color: theme.colors.mutedForeground }]}
      >
        Did this partner help you practice?
      </Text>
      <View style={styles.helpedRow}>
        <Pressable
          nativeID="helped-yes"
          onPress={() => setHelped(true)}
          style={[
            styles.helpedOption,
            {
              backgroundColor:
                helped === true ? theme.colors.primary : theme.colors.muted,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.helpedText,
              {
                color:
                  helped === true
                    ? theme.colors.primaryForeground
                    : theme.colors.typography,
              },
            ]}
          >
            Yes
          </Text>
        </Pressable>
        <Pressable
          nativeID="helped-no"
          onPress={() => setHelped(false)}
          style={[
            styles.helpedOption,
            {
              backgroundColor:
                helped === false ? theme.colors.primary : theme.colors.muted,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.helpedText,
              {
                color:
                  helped === false
                    ? theme.colors.primaryForeground
                    : theme.colors.typography,
              },
            ]}
          >
            No
          </Text>
        </Pressable>
      </View>

      <TextInput
        multiline
        nativeID="rating-comment-input"
        numberOfLines={3}
        onChangeText={setComment}
        placeholder="Optional comment..."
        placeholderTextColor={theme.colors.mutedForeground}
        style={[
          styles.detailsInput,
          {
            color: theme.colors.typography,
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.muted,
          },
        ]}
        value={comment}
      />

      <View style={styles.ratingActions}>
        <Pressable
          nativeID="dismiss-rating-button"
          onPress={onDismissed}
          style={[
            styles.ratingActionBtn,
            { backgroundColor: theme.colors.muted },
          ]}
        >
          <Text
            style={[
              styles.ratingActionText,
              { color: theme.colors.mutedForeground },
            ]}
          >
            Skip
          </Text>
        </Pressable>
        <Pressable
          disabled={!stars || mutation.isPending}
          nativeID="submit-rating-button"
          onPress={handleSubmit}
          style={[
            styles.ratingActionBtn,
            {
              backgroundColor: stars
                ? theme.colors.primary
                : theme.colors.muted,
            },
          ]}
        >
          <Text
            style={[
              styles.ratingActionText,
              {
                color: stars
                  ? theme.colors.primaryForeground
                  : theme.colors.mutedForeground,
              },
            ]}
          >
            {mutation.isPending ? "Sending..." : "Submit rating"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

interface ReportFormProps {
  mutation: UseMutationResult<
    { success: boolean; alreadyReported: boolean; strikeVoided?: boolean },
    Error,
    {
      roomName: string;
      reason: (typeof REPORT_REASONS)[number]["value"];
      details?: string;
    },
    unknown
  >;
  onCancelled: () => void;
  onSubmitted: (strikeVoided: boolean) => void;
  roomName: string;
}

function ReportForm({
  roomName,
  mutation,
  onSubmitted,
  onCancelled,
}: ReportFormProps) {
  const { theme } = useUnistyles();
  const [selectedReason, setSelectedReason] = useState<
    (typeof REPORT_REASONS)[number]["value"] | null
  >(null);
  const [details, setDetails] = useState("");

  const handleSubmit = () => {
    if (!(selectedReason && roomName)) {
      return;
    }
    mutation.mutate(
      {
        roomName,
        reason: selectedReason,
        ...(details.trim() ? { details: details.trim() } : {}),
      },
      {
        onSuccess: (data) => {
          onSubmitted(data.strikeVoided ?? false);
        },
      }
    );
  };

  return (
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
          onPress={onCancelled}
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
          disabled={!selectedReason || mutation.isPending}
          nativeID="submit-report-button"
          onPress={handleSubmit}
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
            {mutation.isPending ? "Sending..." : "Submit report"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

// ── Main screen ─────────────────────────────────────────────────────────

export default function CallEndedScreen() {
  const router = useRouter();
  const { theme } = useUnistyles();
  const { reason, roomName } = useLocalSearchParams<{
    reason?: string;
    roomName?: string;
  }>();

  const [showReportForm, setShowReportForm] = useState(false);
  const [reported, setReported] = useState(false);
  const [reportStrikeVoided, setReportStrikeVoided] = useState(false);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [ratingDismissed, setRatingDismissed] = useState(false);

  const reportMutation = useMutation(
    orpc.moderation.reportPartner.mutationOptions()
  );
  const ratingMutation = useMutation(orpc.rating.ratePartner.mutationOptions());

  const subtitle =
    (reason && END_REASON_MESSAGES[reason]) ?? "The call has ended.";

  const handleBackToLobby = () => router.replace("/call/lobby");
  const handleReturnHome = () => router.replace("/");

  // ── Rating section ────────────────────────────────────────────────────
  let ratingSection: React.ReactNode;
  if (ratingSubmitted) {
    ratingSection = (
      <Text
        nativeID="rating-thanks"
        style={[styles.thanksText, { color: theme.colors.success }]}
      >
        Thanks for rating your partner!
      </Text>
    );
  } else if (ratingDismissed) {
    ratingSection = (
      <Text
        nativeID="rating-dismissed"
        style={[styles.thanksText, { color: theme.colors.mutedForeground }]}
      >
        You can rate your partner later from your call history.
      </Text>
    );
  } else if (roomName) {
    ratingSection = (
      <RatingForm
        mutation={ratingMutation}
        onDismissed={() => setRatingDismissed(true)}
        onSubmitted={() => setRatingSubmitted(true)}
        roomName={roomName}
      />
    );
  }

  // ── Report section ────────────────────────────────────────────────────
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
  } else if (showReportForm && roomName) {
    reportSection = (
      <ReportForm
        mutation={reportMutation}
        onCancelled={() => {
          setShowReportForm(false);
        }}
        onSubmitted={(strikeVoided) => {
          setReportStrikeVoided(strikeVoided);
          setReported(true);
          setShowReportForm(false);
        }}
        roomName={roomName}
      />
    );
  } else {
    reportSection = (
      <Pressable
        nativeID="report-issue-button"
        onPress={() => setShowReportForm(true)}
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
        {ratingSection}
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
        {ratingMutation.isError && (
          <Text
            nativeID="rating-error"
            style={[styles.errorMsg, { color: theme.colors.destructive }]}
          >
            Failed to submit rating. Please try again.
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
  // ── Rating styles ────────────────────────────────────────────────────
  ratingForm: {
    width: "100%",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  ratingFormTitle: {
    fontSize: theme.fontSize.base,
    fontWeight: "600",
    textAlign: "center",
  },
  starsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  starPressable: {
    padding: 4,
  },
  star: {
    fontSize: 32,
  },
  ratingQuestion: {
    fontSize: theme.fontSize.sm,
    textAlign: "center",
  },
  helpedRow: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
  },
  helpedOption: {
    flex: 1,
    maxWidth: 100,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },
  helpedText: {
    fontSize: theme.fontSize.sm,
    fontWeight: "500",
  },
  ratingActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  ratingActionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  ratingActionText: {
    fontSize: theme.fontSize.sm,
    fontWeight: "600",
  },
  // ── Report styles ────────────────────────────────────────────────────
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
  thanksText: {
    fontSize: theme.fontSize.sm,
    textAlign: "center",
    paddingVertical: 8,
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
  errorMsg: {
    fontSize: theme.fontSize.sm,
    textAlign: "center",
  },
}));
