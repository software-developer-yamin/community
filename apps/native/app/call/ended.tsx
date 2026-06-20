import { Stack, useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

export default function CallEndedScreen() {
  const router = useRouter();
  const { theme } = useUnistyles();

  const handleBackToLobby = () => {
    router.replace("call/lobby");
  };

  return (
    <View
      style={[styles.centered, { backgroundColor: theme.colors.background }]}
    >
      <Stack.Screen options={{ title: "Call Ended" }} />
      <Text style={[styles.title, { color: theme.colors.typography }]}>
        Call Ended
      </Text>
      <Text style={[styles.subtitle, { color: theme.colors.mutedForeground }]}>
        The connection was lost.
      </Text>
      <Pressable
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
