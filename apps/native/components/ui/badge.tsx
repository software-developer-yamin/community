import { LinearGradient } from "expo-linear-gradient";
import { Text, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

export function Badge({ children }: { children: string }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{children}</Text>
    </View>
  );
}

export function StreakChip({ days }: { days: number }) {
  const { theme } = useUnistyles();
  return (
    <LinearGradient
      colors={theme.gradients.streak}
      end={{ x: 1, y: 1 }}
      start={{ x: 0, y: 0 }}
      style={styles.chip}
    >
      <Text style={styles.chipEmoji}>🔥</Text>
      <Text style={styles.chipText}>{days}</Text>
    </LinearGradient>
  );
}

export function ProBadge() {
  const { theme } = useUnistyles();
  return (
    <LinearGradient
      colors={theme.gradients.pro}
      end={{ x: 1, y: 1 }}
      start={{ x: 0, y: 0 }}
      style={styles.chip}
    >
      <Text style={styles.proText}>PRO</Text>
    </LinearGradient>
  );
}

export function LiveDot({ label = "LIVE" }: { label?: string }) {
  return (
    <View style={styles.liveWrap}>
      <View style={styles.liveDot} />
      <Text style={styles.liveText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  badge: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: theme.spacing.sm + 2,
    paddingVertical: theme.spacing.xs,
    alignSelf: "flex-start",
  },
  badgeText: {
    fontFamily: theme.fontFamily.caption,
    fontSize: theme.fontSize.xs,
    color: "#FFFFFF",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: theme.spacing.sm + 4,
    paddingVertical: theme.spacing.xs,
    alignSelf: "flex-start",
  },
  chipEmoji: {
    fontSize: theme.fontSize.sm,
  },
  chipText: {
    fontFamily: theme.fontFamily.label,
    fontSize: theme.fontSize.sm,
    color: "#FFFFFF",
  },
  proText: {
    fontFamily: theme.fontFamily.caption,
    fontSize: theme.fontSize.xs,
    color: "#4A3306",
    letterSpacing: 0.5,
  },
  liveWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.destructiveSurface,
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs / 2,
    alignSelf: "flex-start",
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.destructive,
  },
  liveText: {
    fontFamily: theme.fontFamily.caption,
    fontSize: theme.fontSize.xs,
    color: theme.colors.destructive,
    letterSpacing: 0.5,
  },
}));
