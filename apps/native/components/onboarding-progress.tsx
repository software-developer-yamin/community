import { useSyncExternalStore } from "react";
import { Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { ProgressBar } from "@/components/ui/progress-bar";

export type OnboardingGoal = string;
export type OnboardingLevel = string;
export type OnboardingNativeLanguage = string;

interface OnboardingProgressValue {
  avatarUri: null | string;
  bio: string;
  dailyGoalMinutes: null | number;
  displayName: string;
  goal: null | OnboardingGoal;
  level: null | OnboardingLevel;
  nativeLanguage: null | OnboardingNativeLanguage;
  setAvatarUri: (value: null | string) => void;
  setBio: (value: string) => void;
  setDailyGoalMinutes: (value: null | number) => void;
  setDisplayName: (value: string) => void;
  setGoal: (value: null | OnboardingGoal) => void;
  setLevel: (value: null | OnboardingLevel) => void;
  setNativeLanguage: (value: null | OnboardingNativeLanguage) => void;
}

// Module-scoped, not a Provider: the onboarding screens live in a Stack, so
// every push unmounts the previous screen's tree and a context provider there
// would reset. In-memory only — no persistence.
const store: OnboardingProgressValue = {
  avatarUri: null,
  bio: "",
  dailyGoalMinutes: null,
  displayName: "",
  goal: null,
  level: null,
  nativeLanguage: null,
  setAvatarUri: (value) => {
    store.avatarUri = value;
    notify();
  },
  setBio: (value) => {
    store.bio = value;
    notify();
  },
  setDailyGoalMinutes: (value) => {
    store.dailyGoalMinutes = value;
    notify();
  },
  setDisplayName: (value) => {
    store.displayName = value;
    notify();
  },
  setGoal: (value) => {
    store.goal = value;
    notify();
  },
  setLevel: (value) => {
    store.level = value;
    notify();
  },
  setNativeLanguage: (value) => {
    store.nativeLanguage = value;
    notify();
  },
};

const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): OnboardingProgressValue {
  return store;
}

/** Current onboarding answers plus a typed setter per field. */
export function useOnboardingProgress(): OnboardingProgressValue {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** Shared masthead: step counter, headline, supporting line, progress bar. */
export function OnboardingHeader({
  step,
  totalSteps,
  title,
  subtitle,
}: {
  step: number;
  totalSteps: number;
  title: string;
  subtitle: string;
}) {
  const progressValue = step / totalSteps;

  return (
    <View style={styles.header}>
      <View style={styles.metaRow}>
        <Text style={styles.step}>
          STEP {step} OF {totalSteps}
        </Text>
        <Text style={styles.step}>{Math.round(progressValue * 100)}%</Text>
      </View>
      <ProgressBar progress={progressValue} />
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  header: {
    gap: theme.spacing.sm,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  step: {
    fontFamily: theme.fontFamily.label,
    fontSize: theme.fontSize.xs,
    color: theme.colors.mutedForeground,
    letterSpacing: 1,
  },
  title: {
    fontFamily: theme.fontFamily.headline,
    fontSize: theme.fontSize["2xl"],
    color: theme.colors.foreground,
    lineHeight: theme.fontSize["2xl"] * 1.25,
  },
  subtitle: {
    fontFamily: theme.fontFamily.body,
    fontSize: theme.fontSize.sm,
    color: theme.colors.mutedForeground,
    lineHeight: theme.fontSize.sm * 1.5,
  },
}));
