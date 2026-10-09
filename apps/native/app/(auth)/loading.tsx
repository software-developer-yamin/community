import { ActivityIndicator, Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { FormScreenShell } from "@/components/ui/screen-shell";

/** App-loading state — shown while the session and cached queries warm up. */
export default function Loading() {
  return (
    <FormScreenShell>
      <View style={styles.center}>
        <Text accessibilityRole="header" style={styles.wordmark}>
          AceFluency
        </Text>
        <View
          accessibilityLabel="Loading"
          accessibilityRole="progressbar"
          style={styles.loader}
        >
          <ActivityIndicator color="#6C4DFF" size="large" />
        </View>
        <Text style={styles.status}>Warming up your practice room…</Text>
      </View>
    </FormScreenShell>
  );
}

const styles = StyleSheet.create((theme) => ({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.md,
  },
  wordmark: {
    fontFamily: theme.fontFamily.display,
    fontSize: theme.fontSize["2xl"],
    color: theme.colors.foreground,
  },
  loader: {
    paddingVertical: theme.spacing.md,
  },
  status: {
    fontFamily: theme.fontFamily.caption,
    fontSize: theme.fontSize.sm,
    color: theme.colors.mutedForeground,
  },
}));
