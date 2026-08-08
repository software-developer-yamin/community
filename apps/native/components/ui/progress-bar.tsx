import { LinearGradient } from "expo-linear-gradient";
import { View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

const MIN_PCT = 0;
const MAX_PCT = 100;

export function ProgressBar({
  progress,
  gradient = "practice",
}: {
  /** 0–1 */
  progress: number;
  gradient?: "practice" | "streak";
}) {
  const { theme } = useUnistyles();
  const pct = Math.max(MIN_PCT, Math.min(MAX_PCT, progress * 100));

  return (
    <View style={styles.track}>
      <LinearGradient
        colors={theme.gradients[gradient]}
        end={{ x: 1, y: 0 }}
        start={{ x: 0, y: 0 }}
        style={[styles.fill, { width: `${pct}%` }]}
      />
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  track: {
    height: 10,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.muted,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: theme.borderRadius.full,
  },
}));
