import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Text } from "react-native";
import { StyleSheet } from "react-native-unistyles";

/** Branded AceFluency splash — wordmark over the practice gradient. */
export default function SplashScreen() {
  return (
    <LinearGradient
      colors={["#6C4DFF", "#FF6B4A"]}
      end={{ x: 1, y: 1 }}
      start={{ x: 0, y: 0 }}
      style={styles.root}
    >
      <Ionicons
        accessibilityElementsHidden
        color="#FFFFFF"
        name="mic"
        size={56}
      />
      <Text accessibilityRole="header" style={styles.wordmark}>
        AceFluency
      </Text>
      <Text style={styles.tagline}>Find your voice. Own the room.</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create((theme) => ({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
  },
  wordmark: {
    fontFamily: theme.fontFamily.display,
    fontSize: theme.fontSize["3xl"],
    letterSpacing: -0.02,
    color: "#FFFFFF",
  },
  tagline: {
    fontFamily: theme.fontFamily.caption,
    fontSize: theme.fontSize.sm,
    color: "#FFFFFF",
    opacity: 0.85,
    textAlign: "center",
  },
}));
