import { Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

/**
 * Countdown badge for timed recording/speaking flows (AI test, call timer).
 * Deliberately not a precise SVG arc — this project has no SVG dependency and
 * none may be added — so progress reads through ring color + a linear
 * ProgressBar placed alongside, not an animated stroke-dashoffset arc.
 */
export function CircularTimer({
  secondsLeft,
  size = 120,
  urgentBelowSeconds = 20,
}: {
  secondsLeft: number;
  totalSeconds?: number;
  size?: number;
  urgentBelowSeconds?: number;
}) {
  const isUrgent = secondsLeft <= urgentBelowSeconds;
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  return (
    <View
      style={[
        styles.ring,
        isUrgent && styles.ringUrgent,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Text style={[styles.label, isUrgent && styles.labelUrgent]}>
        {`${minutes}:${seconds.toString().padStart(2, "0")}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  ring: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 6,
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.card,
  },
  ringUrgent: {
    borderColor: theme.colors.destructive,
  },
  label: {
    fontFamily: theme.fontFamily.headline,
    fontSize: theme.fontSize["2xl"],
    color: theme.colors.foreground,
  },
  labelUrgent: {
    color: theme.colors.destructive,
  },
}));
