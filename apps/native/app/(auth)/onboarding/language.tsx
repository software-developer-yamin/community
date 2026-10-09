import { NATIVE_LANG_MAP } from "@community/api/lib/native-lang";
import { useRouter } from "expo-router";
import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import {
  OnboardingHeader,
  useOnboardingProgress,
} from "@/components/onboarding-progress";
import { Button } from "@/components/ui/button";
import { RadioTile } from "@/components/ui/radio-tile";
import { FormScreenShell } from "@/components/ui/screen-shell";

const STEP = 1;
const TOTAL_STEPS = 7;

const LANGUAGE_COPY: Record<string, string> = {
  arabic: "Exercise explanations and trainer intros in العربية.",
  bangla: "Exercise explanations and trainer intros in বাংলা.",
  english: "Exercise explanations and trainer intros in English.",
  french: "Exercices et présentations de formateurs en Français.",
  hindi: "Exercise explanations and trainer intros in हिन्दी.",
  spanish: "Ejercicios y presentaciones de entrenadores en Español.",
};

export default function Language() {
  const router = useRouter();
  const { nativeLanguage, setNativeLanguage } = useOnboardingProgress();

  return (
    <FormScreenShell>
      <OnboardingHeader
        step={STEP}
        subtitle="This is the language your practice instructions and trainer introductions appear in. You can still talk English with anyone, regardless of what you pick here."
        title="What language do you think in?"
        totalSteps={TOTAL_STEPS}
      />

      <View style={styles.options}>
        {NATIVE_LANG_MAP.map((lang) => (
          <RadioTile
            description={LANGUAGE_COPY[lang.value]}
            icon="language"
            key={lang.key}
            label={lang.label}
            onPress={() => {
              setNativeLanguage(lang.value);
            }}
            selected={nativeLanguage === lang.value}
          />
        ))}
      </View>

      <Button
        accessibilityHint="Moves on to choosing what you are learning English for."
        disabled={!nativeLanguage}
        onPress={() => {
          router.push("/(auth)/onboarding/goal");
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
}));
