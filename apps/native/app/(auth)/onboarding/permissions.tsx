import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import type { ComponentProps } from "react";
import { Text, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { useOnboardingProgress } from "@/components/onboarding-progress";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormScreenShell } from "@/components/ui/screen-shell";

type IoniconName = ComponentProps<typeof Ionicons>["name"];

interface PermissionCard {
  body: string;
  icon: IoniconName;
  title: string;
}

// Neither expo-notifications nor an Expo audio/microphone module is installed
// in this app yet, so this screen explains both requests instead of triggering
// them. Wire the real request calls in here once the packages land.
const PERMISSIONS: PermissionCard[] = [
  {
    title: "Microphone",
    icon: "mic",
    body: "Every live room and 1-on-1 call needs it. AceFluency only records while you're in a speaking test, and the recording is scored and then discarded.",
  },
  {
    title: "Notifications",
    icon: "notifications",
    body: "One reminder at the time you chose for your daily minutes, plus a nudge when a trainer you've booked goes live. Nothing else.",
  },
];

const STEP = 7;
const TOTAL_STEPS = 7;

export default function Permissions() {
  const router = useRouter();
  const { theme } = useUnistyles();
  const { dailyGoalMinutes, displayName } = useOnboardingProgress();

  function finish() {
    router.replace("/(app)");
  }

  return (
    <FormScreenShell>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>
          STEP {STEP} OF {TOTAL_STEPS}
        </Text>
        <Text accessibilityRole="header" style={styles.title}>
          Two permissions, both optional
        </Text>
        <Text style={styles.subtitle}>
          We ask inside the app when you first need them, not all at once. You
          can deny both and nothing is locked — you just won't get a live call
          or a reminder.
        </Text>
      </View>

      {PERMISSIONS.map((permission) => (
        <Card key={permission.title} style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconWrap}>
              <Ionicons
                color={theme.colors.primary}
                name={permission.icon}
                size={22}
              />
            </View>
            <Text style={styles.cardTitle}>{permission.title}</Text>
          </View>
          <Text style={styles.cardBody}>{permission.body}</Text>
        </Card>
      ))}

      <Text style={styles.footer}>
        {displayName.trim() || "Your account"}
        {dailyGoalMinutes
          ? ` is ready for ${dailyGoalMinutes} minutes a day.`
          : " is ready to go."}
      </Text>

      <Button
        accessibilityHint="Finishes onboarding and opens the app."
        onPress={finish}
      >
        Start practicing
      </Button>

      <Button
        accessibilityHint="Finishes onboarding now. You can grant permissions later from Settings."
        onPress={finish}
        variant="secondary"
      >
        Not now
      </Button>
    </FormScreenShell>
  );
}

const styles = StyleSheet.create((theme) => ({
  header: {
    gap: theme.spacing.sm,
  },
  eyebrow: {
    fontFamily: theme.fontFamily.label,
    fontSize: theme.fontSize.xs,
    color: theme.colors.primary,
    letterSpacing: 1,
  },
  title: {
    fontFamily: theme.fontFamily.display,
    fontSize: theme.fontSize["2xl"],
    color: theme.colors.foreground,
    lineHeight: theme.fontSize["2xl"] * 1.2,
  },
  subtitle: {
    fontFamily: theme.fontFamily.body,
    fontSize: theme.fontSize.sm,
    color: theme.colors.mutedForeground,
    lineHeight: theme.fontSize.sm * 1.5,
  },
  card: {
    gap: theme.spacing.sm,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontFamily: theme.fontFamily.title,
    fontSize: theme.fontSize.lg,
    color: theme.colors.foreground,
  },
  cardBody: {
    fontFamily: theme.fontFamily.body,
    fontSize: theme.fontSize.base,
    color: theme.colors.foreground,
    lineHeight: theme.fontSize.base * 1.5,
  },
  footer: {
    fontFamily: theme.fontFamily.caption,
    fontSize: theme.fontSize.xs,
    color: theme.colors.mutedForeground,
    textAlign: "center",
  },
}));
