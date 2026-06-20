import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

const END_REASON_MESSAGES: Record<string, string> = {
  connection_lost: "The connection was lost.",
  explicit: "You left the call.",
  disconnect: "The call was disconnected.",
  timeout: "The call timed out.",
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

  return (
    <View
      style={[styles.centered, { backgroundColor: theme.colors.background }]}
    >
      <Stack.Screen options={{ title: "Call Ended" }} />
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
      <Pressable
        nativeID="back-to-lobby-button"
        onPress={handleBackToLobby}
        style={[styles.button, { backgroundColor: theme.colors.primary }]}
      >
        <Text
          style={[styles.buttonText, { color: theme.colors.primaryForeground }]}
        >
          Back to lobby
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    padding: 24,
  },
  title: {
    fontSize: theme.fontSize["2xl"],
    fontWeight: "700",
  },
  subtitle: {
    fontSize: theme.fontSize.base,
    textAlign: "center",
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  buttonText: {
    fontSize: theme.fontSize.base,
    fontWeight: "600",
  },
}));
