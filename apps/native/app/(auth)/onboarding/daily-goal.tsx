import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Text, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import {
  OnboardingHeader,
  useOnboardingProgress,
} from "@/components/onboarding-progress";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { FormScreenShell } from "@/components/ui/screen-shell";

const MINUTE_OPTIONS = [15, 30, 45, 60] as const;

const MINUTE_COPY: Record<number, string> = {
  15: "A short daily call — about 2 weeks a month of talking.",
  30: "The habit most people can hold without missing days.",
  45: "Enough room for a practice room plus a short lesson.",
  60: "Serious pace. Expect visible change within a month.",
};

const STEP = 4;
const TOTAL_STEPS = 7;

export default function DailyGoal() {
  const router = useRouter();
  const { theme } = useUnistyles();
  const { dailyGoalMinutes, setDailyGoalMinutes } = useOnboardingProgress();

  return (
    <FormScreenShell>
      <OnboardingHeader
        step={STEP}
        subtitle="Your daily target is minutes of speaking out loud — not lessons watched. Count the calls, not the videos."
        title="How many minutes a day?"
        totalSteps={TOTAL_STEPS}
      />

      <View style={styles.chips}>
        {MINUTE_OPTIONS.map((minutes) => (
          <Chip
            key={minutes}
            label={`${minutes} min`}
            onPress={() => {
              setDailyGoalMinutes(minutes);
            }}
            selected={dailyGoalMinutes === minutes}
          />
        ))}
      </View>

      <View style={styles.detailCard}>
        <View style={styles.detailRow}>
          <Ionicons color={theme.colors.secondary} name="flame" size={20} />
          <Text style={styles.detailTitle}>
            {dailyGoalMinutes
              ? `${dailyGoalMinutes} minutes a day`
              : "Pick a target to see the plan"}
          </Text>
        </View>
        <Text style={styles.detailBody}>
          {dailyGoalMinutes
            ? MINUTE_COPY[dailyGoalMinutes]
            : "You can change this later, but a target you can hit on a bad day beats an ambitious one you abandon by week two."}
        </Text>
      </View>

      <View style={styles.noteRow}>
        <Ionicons
          color={theme.colors.mutedForeground}
          name="notifications-outline"
          size={16}
        />
        <Text style={styles.note}>
          We'll ask about reminders in a moment. Until then, nothing is
          scheduled and no notifications are sent.
        </Text>
      </View>

      <Button
        accessibilityHint="Moves on to setting up your profile."
        disabled={!dailyGoalMinutes}
        onPress={() => {
          router.push("/(auth)/onboarding/profile");
        }}
      >
        Continue
      </Button>
    </FormScreenShell>
  );
}

const styles = StyleSheet.create((theme) => ({
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
  },
  detailCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
    ...theme.shadow.card,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  detailTitle: {
    fontFamily: theme.fontFamily.title,
    fontSize: theme.fontSize.base,
    color: theme.colors.foreground,
  },
  detailBody: {
    fontFamily: theme.fontFamily.body,
    fontSize: theme.fontSize.sm,
    color: theme.colors.mutedForeground,
    lineHeight: theme.fontSize.sm * 1.5,
  },
  noteRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing.sm,
  },
  note: {
    flex: 1,
    fontFamily: theme.fontFamily.caption,
    fontSize: theme.fontSize.xs,
    color: theme.colors.mutedForeground,
    lineHeight: theme.fontSize.xs * 1.5,
  },
}));
