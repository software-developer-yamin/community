/*
 * AceFluency / Learning
 *
 * THESIS — One hub for every non-live way to improve: AI test, courses,
 *   audio, words, translation, news.
 * OWN-WORLD — Golden Hour Studio: a grid of entry cards, AI card carries the
 *   Practice Gradient since it's this tab's premium/AI touchpoint.
 * STORY — Scan the grid → pick the format that fits right now.
 * FIRST VIEWPORT — AI Speaking Test spotlight card, then a 2-column grid.
 * FORM — Spotlight card + grid, consistent card language with Home.
 */

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Link } from "expo-router";
import type { ComponentProps } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { Card } from "@/components/ui/card";

type IoniconName = ComponentProps<typeof Ionicons>["name"];

const GRID_ITEMS: { icon: IoniconName; label: string; meta: string }[] = [
  {
    icon: "play-circle-outline",
    label: "Video courses",
    meta: "Beginner–Advanced",
  },
  {
    icon: "headset-outline",
    label: "Audio courses",
    meta: "Grammar · Vocabulary",
  },
  { icon: "text-outline", label: "Daily words", meta: "5 new words" },
  { icon: "language-outline", label: "Translator", meta: "Quick translate" },
  { icon: "newspaper-outline", label: "Daily news", meta: "Read & learn" },
  { icon: "bookmark-outline", label: "Saved words", meta: "Your list" },
];

export default function LearningScreen() {
  const { theme } = useUnistyles();

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageTitle}>Learning</Text>

        <Link asChild href="/ai-test">
          <Pressable
            accessibilityLabel="Start AI speaking test"
            accessibilityRole="button"
          >
            <LinearGradient
              colors={theme.gradients.practice}
              end={{ x: 1, y: 1 }}
              start={{ x: 0, y: 0 }}
              style={[styles.aiCard, theme.shadow.cta]}
            >
              <View style={styles.aiIconWrap}>
                <Ionicons color="#FFFFFF" name="sparkles" size={26} />
              </View>
              <View style={styles.aiTextWrap}>
                <Text style={styles.aiTitle}>AI Speaking Test</Text>
                <Text style={styles.aiBody}>
                  32 topics · Grammar, vocabulary & fluency scoring
                </Text>
              </View>
              <Ionicons color="#FFFFFF" name="chevron-forward" size={22} />
            </LinearGradient>
          </Pressable>
        </Link>

        <View style={styles.grid}>
          {GRID_ITEMS.map((item) => (
            <Card key={item.label} style={styles.gridCard}>
              <View style={styles.gridIconWrap}>
                <Ionicons
                  color={theme.colors.primary}
                  name={item.icon}
                  size={22}
                />
              </View>
              <Text style={styles.gridLabel}>{item.label}</Text>
              <Text style={styles.gridMeta}>{item.meta}</Text>
            </Card>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create((theme, rt) => ({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: rt.insets.top + theme.spacing.md,
    paddingBottom: rt.insets.bottom + 68 + theme.spacing.xl,
    gap: theme.spacing.lg,
  },
  pageTitle: {
    fontFamily: theme.fontFamily.display,
    fontSize: theme.fontSize["3xl"],
    color: theme.colors.foreground,
  },
  aiCard: {
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
  },
  aiIconWrap: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.full,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  aiTextWrap: {
    flex: 1,
    gap: 2,
  },
  aiTitle: {
    fontFamily: theme.fontFamily.title,
    fontSize: theme.fontSize.lg,
    color: "#FFFFFF",
  },
  aiBody: {
    fontFamily: theme.fontFamily.body,
    fontSize: theme.fontSize.xs,
    color: "rgba(255,255,255,0.9)",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.md,
  },
  gridCard: {
    width: "47%",
    gap: theme.spacing.sm,
  },
  gridIconWrap: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  gridLabel: {
    fontFamily: theme.fontFamily.title,
    fontSize: theme.fontSize.sm,
    color: theme.colors.foreground,
  },
  gridMeta: {
    fontFamily: theme.fontFamily.caption,
    fontSize: theme.fontSize.xs,
    color: theme.colors.mutedForeground,
  },
}));
