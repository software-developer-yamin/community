import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import type { ComponentProps } from "react";
import { Text, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormScreenShell } from "@/components/ui/screen-shell";

type IoniconName = ComponentProps<typeof Ionicons>["name"];

interface Feature {
  body: string;
  bullets: string[];
  icon: IoniconName;
  title: string;
}

const FEATURES: Feature[] = [
  {
    icon: "people",
    title: "Live co-learner rooms",
    body: "Small voice rooms that open all day. Drop in, say your sentence out loud, and let someone correct you in real time.",
    bullets: [
      "Level-matched rooms, 10 seats max",
      "Raise a hand when you want to speak",
      "Hosts keep conversations on topic",
    ],
  },
  {
    icon: "briefcase",
    title: "Trainer marketplace",
    body: "Browse certified trainers by rating, language, and session count. Book a 1-on-1 or join a small batch on a fixed schedule.",
    bullets: [
      "Free 30-minute trial with most trainers",
      "Sample audio before you call",
      "Reschedule up to 4 hours ahead",
    ],
  },
  {
    icon: "sparkles",
    title: "AI speaking test",
    body: "A 60-second voice answer on any of 32 topics, scored on fluency, grammar, vocabulary, and pronunciation — with the transcript to compare.",
    bullets: [
      "Works offline, no partner needed",
      "Re-take a topic to see the score move",
      "History unlocks with AceFluency Pro",
    ],
  },
];

export default function Features() {
  const router = useRouter();
  const { theme } = useUnistyles();

  return (
    <FormScreenShell>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>WHAT'S INSIDE</Text>
        <Text accessibilityRole="header" style={styles.title}>
          Three ways to practice English out loud
        </Text>
        <Text style={styles.subtitle}>
          You don't have to pick one now. Everything below is open to you from
          day one — change your mind as many times as you like.
        </Text>
      </View>

      {FEATURES.map((feature) => (
        <Card key={feature.title} style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconWrap}>
              <Ionicons
                color={theme.colors.primary}
                name={feature.icon}
                size={22}
              />
            </View>
            <Text style={styles.cardTitle}>{feature.title}</Text>
          </View>
          <Text style={styles.cardBody}>{feature.body}</Text>
          <View style={styles.bullets}>
            {feature.bullets.map((bullet) => (
              <View key={bullet} style={styles.bulletRow}>
                <Ionicons
                  color={theme.colors.success}
                  name="checkmark-circle"
                  size={16}
                />
                <Text style={styles.bulletText}>{bullet}</Text>
              </View>
            ))}
          </View>
        </Card>
      ))}

      <Button
        accessibilityHint="Moves on to choosing your native language."
        onPress={() => {
          router.push("/(auth)/onboarding/language");
        }}
      >
        Set up my practice
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
    flex: 1,
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
  bullets: {
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  bulletText: {
    flex: 1,
    fontFamily: theme.fontFamily.body,
    fontSize: theme.fontSize.sm,
    color: theme.colors.mutedForeground,
  },
}));
