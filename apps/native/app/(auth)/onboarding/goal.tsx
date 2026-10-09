import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import type { ComponentProps } from "react";
import { Text, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import {
  OnboardingHeader,
  useOnboardingProgress,
} from "@/components/onboarding-progress";
import { Button } from "@/components/ui/button";
import { RadioTile } from "@/components/ui/radio-tile";
import { FormScreenShell } from "@/components/ui/screen-shell";

type IoniconName = ComponentProps<typeof Ionicons>["name"];

interface GoalOption {
  description: string;
  icon: IoniconName;
  label: string;
  value: string;
}

const GOALS: GoalOption[] = [
  {
    value: "job_interviews",
    label: "Job interviews",
    description:
      "Tell your story, answer the hard questions, and sound like yourself in English.",
    icon: "briefcase",
  },
  {
    value: "everyday_confidence",
    label: "Everyday confidence",
    description:
      "Order food, argue a refund, chat with neighbours — stop translating in your head.",
    icon: "chatbubbles",
  },
  {
    value: "study_abroad",
    label: "Study abroad",
    description:
      "Group projects, campus seminars, and the language test that comes with the offer.",
    icon: "school",
  },
  {
    value: "business_english",
    label: "Work and meetings",
    description:
      "Present a proposal, disagree in a meeting, and write an email nobody has to fix.",
    icon: "construct",
  },
  {
    value: "travel",
    label: "Travel",
    description:
      "Airports, homestays, and the small talk that turns a trip into a memory.",
    icon: "airplane",
  },
  {
    value: "pronunciation",
    label: "Clear pronunciation",
    description:
      "Fix the sounds people repeat back to you, one word at a time.",
    icon: "mic",
  },
];

const STEP = 2;
const TOTAL_STEPS = 7;

export default function Goal() {
  const router = useRouter();
  const { theme } = useUnistyles();
  const { goal, setGoal } = useOnboardingProgress();

  return (
    <FormScreenShell>
      <OnboardingHeader
        step={STEP}
        subtitle="Pick the reason that made you install this. We use it to choose your partners, rooms, and trainer recommendations — not to lock you in."
        title="What are you learning English for?"
        totalSteps={TOTAL_STEPS}
      />

      <View style={styles.options}>
        {GOALS.map((option) => (
          <RadioTile
            description={option.description}
            icon={option.icon}
            key={option.value}
            label={option.label}
            onPress={() => {
              setGoal(option.value);
            }}
            selected={goal === option.value}
          />
        ))}
      </View>

      <View style={styles.noteRow}>
        <Ionicons
          color={theme.colors.mutedForeground}
          name="information-circle-outline"
          size={16}
        />
        <Text style={styles.note}>
          You can change this any time from Settings — it only affects what we
          recommend.
        </Text>
      </View>

      <Button
        accessibilityHint="Moves on to your current English level."
        disabled={!goal}
        onPress={() => {
          router.push("/(auth)/onboarding/level");
        }}
      >
        Continue
      </Button>
    </FormScreenShell>
  );
}

const styles = StyleSheet.create((theme) => ({
  options: {
    gap: theme.spacing.sm,
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
