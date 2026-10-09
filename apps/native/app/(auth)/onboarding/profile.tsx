import { useMutation } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import {
  OnboardingHeader,
  useOnboardingProgress,
} from "@/components/onboarding-progress";
import { Button } from "@/components/ui/button";
import { FormScreenShell } from "@/components/ui/screen-shell";
import { TextField } from "@/components/ui/text-field";
import { orpc } from "@/utils/orpc";

const STEP = 5;
const TOTAL_STEPS = 7;
const NAME_MIN = 2;
const NAME_MAX = 30;
const BIO_MAX = 140;

const BIO_LIMIT_HINT = `${BIO_MAX} characters — this is the line other learners see next to your name.`;

export default function Profile() {
  const router = useRouter();
  const {
    bio,
    dailyGoalMinutes,
    displayName,
    goal,
    level,
    nativeLanguage,
    setBio,
    setDisplayName,
  } = useOnboardingProgress();
  const [error, setError] = useState<string | null>(null);

  const updateProfile = useMutation(
    orpc.rebuild.updateProfile.mutationOptions()
  );
  const updatePreferences = useMutation(
    orpc.recommendations.updatePreferences.mutationOptions({})
  );

  const trimmedName = displayName.trim();
  const nameIsValid = trimmedName.length >= NAME_MIN;
  const isSubmitting = updateProfile.isPending || updatePreferences.isPending;

  async function handleContinue() {
    if (!nameIsValid) {
      setError(
        `Add a name with at least ${NAME_MIN} characters — it's how trainers greet you on your first call.`
      );
      return;
    }

    setError(null);

    // Profile fields the server owns. Preferences carry goal + daily minutes.
    const nativeLanguagePayload = nativeLanguage
      ? { nativeLanguage }
      : undefined;
    const goalPayload = goal ? { goals: [goal] } : undefined;
    const dailyGoalPayload = dailyGoalMinutes
      ? { dailyGoal: dailyGoalMinutes }
      : undefined;

    try {
      await Promise.all([
        updateProfile.mutateAsync({
          displayName: trimmedName.slice(0, NAME_MAX),
          ...nativeLanguagePayload,
        }),
        updatePreferences.mutateAsync({
          ...goalPayload,
          ...dailyGoalPayload,
        }),
      ]);
    } catch {
      // Profile writes are recoverable — the local answers stay in context and
      // the next sign-in attempt re-sends them.
    }

    router.push("/(auth)/onboarding/avatar");
  }

  return (
    <FormScreenShell>
      <OnboardingHeader
        step={STEP}
        subtitle="Your display name is what other learners hear when you join a room. Nothing here is shared until you join a call."
        title="How should we introduce you?"
        totalSteps={TOTAL_STEPS}
      />

      <TextField
        autoCapitalize="words"
        autoComplete="name"
        errorText={error}
        helperText={
          nameIsValid
            ? "This is the name trainers will greet you by."
            : undefined
        }
        icon="person-outline"
        label="Display name"
        onChangeText={(value) => {
          setDisplayName(value);
          if (error) {
            setError(null);
          }
        }}
        placeholder="e.g. Nusrat Jahan"
        returnKeyType="next"
        textContentType="name"
        value={displayName}
      />

      <TextField
        autoCapitalize="sentences"
        helperText={BIO_LIMIT_HINT}
        icon="chatbox-ellipses-outline"
        label="One line about you"
        onChangeText={setBio}
        placeholder="e.g. IELTS in March, currently in Dhaka."
        returnKeyType="done"
        value={bio}
      />

      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Your answers so far</Text>
        <Text style={styles.summaryLine}>
          Language: {nativeLanguage ?? "not chosen yet"}
        </Text>
        <Text style={styles.summaryLine}>Goal: {goal ?? "not chosen yet"}</Text>
        <Text style={styles.summaryLine}>
          Level: {level ?? "not chosen yet"}
        </Text>
        <Text style={styles.summaryLine}>
          Daily target:{" "}
          {dailyGoalMinutes ? `${dailyGoalMinutes} min` : "not chosen yet"}
        </Text>
      </View>

      <Button
        accessibilityHint="Saves your profile and moves on to your avatar."
        disabled={!nameIsValid || isSubmitting}
        loading={isSubmitting}
        onPress={handleContinue}
      >
        Continue
      </Button>
    </FormScreenShell>
  );
}

const styles = StyleSheet.create((theme) => ({
  summaryCard: {
    backgroundColor: theme.colors.accent,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  summaryTitle: {
    fontFamily: theme.fontFamily.label,
    fontSize: theme.fontSize.sm,
    color: theme.colors.foreground,
    marginBottom: theme.spacing.xs,
  },
  summaryLine: {
    fontFamily: theme.fontFamily.body,
    fontSize: theme.fontSize.sm,
    color: theme.colors.mutedForeground,
  },
}));
