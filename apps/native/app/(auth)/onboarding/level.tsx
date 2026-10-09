import { useRouter } from "expo-router";
import { Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import {
  OnboardingHeader,
  useOnboardingProgress,
} from "@/components/onboarding-progress";
import { Button } from "@/components/ui/button";
import { RadioTile } from "@/components/ui/radio-tile";
import { FormScreenShell } from "@/components/ui/screen-shell";

const LEVELS = [
  {
    value: "beginner",
    label: "Beginner",
    description:
      "You recognise common words but freeze mid-sentence. Good partners make you repeat and rephrase a lot — that's the point.",
  },
  {
    value: "intermediate",
    label: "Intermediate",
    description:
      "You can hold a conversation about familiar things. Tenses slip and accents make you harder to follow than you'd like.",
  },
  {
    value: "advanced",
    label: "Advanced",
    description:
      "You argue, summarise, and improvise. You're here to sharpen detail and lose the last of your hesitation.",
  },
] as const;

const STEP = 3;
const TOTAL_STEPS = 7;

export default function Level() {
  const router = useRouter();
  const { level, setLevel } = useOnboardingProgress();

  return (
    <FormScreenShell>
      <OnboardingHeader
        step={STEP}
        subtitle="Be honest, not modest. This sets who you get matched with, and being a stretch is better than being bored."
        title="Where is your English right now?"
        totalSteps={TOTAL_STEPS}
      />

      <View style={styles.options}>
        {LEVELS.map((option) => (
          <RadioTile
            description={option.description}
            icon="trending-up"
            key={option.value}
            label={option.label}
            onPress={() => {
              setLevel(option.value);
            }}
            selected={level === option.value}
          />
        ))}
      </View>

      <Text style={styles.note}>
        Not sure? Pick the lower one. Matching gently upward is the fastest way
        to stop translating before you speak.
      </Text>

      <Button
        accessibilityHint="Moves on to your daily practice goal."
        disabled={!level}
        onPress={() => {
          router.push("/(auth)/onboarding/daily-goal");
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
  note: {
    flex: 1,
    fontFamily: theme.fontFamily.caption,
    fontSize: theme.fontSize.xs,
    color: theme.colors.mutedForeground,
    lineHeight: theme.fontSize.xs * 1.5,
  },
  spacer: {
    height: 0,
    overflow: "hidden",
  },
  spacerText: {
    fontSize: 0,
  },
}));
