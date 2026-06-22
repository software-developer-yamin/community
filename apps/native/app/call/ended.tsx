import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

const END_REASON_MESSAGES: Record<string, string> = {
  connection_lost: "Call ended — connection lost",
  explicit: "Call ended — you ended the call",
  disconnect: "Call ended — the call was disconnected.",
  timeout: "Call ended — the call timed out.",
  partner_ended: "Call ended — your partner ended the call",
};

export default function CallEndedScreen() {
  const router = useRouter();
  const { theme } = useUnistyles();
  const { reason } = useLocalSearchParams<{ reason?: string }>();

  const subtitle =
    (reason && END_REASON_MESSAGES[reason]) ?? "The call has ended.";

  const handleBackToLobby = () => {
    router.replace("call/lobby");
  };

  const handleReportIssue = () => {
    console.warn("Report issue coming soon");
  };

  const handleReturnHome = () => {
    router.replace("/");
  };

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
}));
