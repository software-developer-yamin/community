import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { Card } from "@/components/ui/card";

interface Topic {
  category: string;
  id: string;
  title: string;
}

const TOPICS: Topic[] = [
  { id: "daily-routine", title: "My Daily Routine", category: "Personal" },
  { id: "hometown", title: "My Hometown", category: "Place" },
  { id: "favorite-food", title: "My Favorite Food", category: "Food" },
  { id: "dream-job", title: "My Dream Job", category: "Career" },
  { id: "travel", title: "A Place I'd Like to Visit", category: "Place" },
  { id: "interview", title: "Introduce Yourself", category: "Career" },
];

const CATEGORIES = ["All", "Personal", "Place", "Food", "Career"];

export default function AiTestTopics() {
  const { theme } = useUnistyles();
  const router = useRouter();
  const [category, setCategory] = useState("All");

  const filtered = useMemo(
    () =>
      category === "All"
        ? TOPICS
        : TOPICS.filter((topic) => topic.category === category),
    [category]
  );

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Go back"
          accessibilityRole="button"
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons
            color={theme.colors.foreground}
            name="chevron-back"
            size={24}
          />
        </Pressable>
        <Text style={styles.headerTitle}>AI Speaking Test</Text>
        <View style={styles.headerRightPlaceholder} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={theme.gradients.practice}
          end={{ x: 1, y: 1 }}
          start={{ x: 0, y: 0 }}
          style={styles.introBand}
        >
          <View style={styles.introIconWrap}>
            <Ionicons color="#FFFFFF" name="sparkles" size={26} />
          </View>
          <Text style={styles.introTitle}>Choose a topic</Text>
          <Text style={styles.introBody}>
            Select a topic to start your AI-powered speaking test.
          </Text>
        </LinearGradient>

        <ScrollView
          contentContainerStyle={styles.chipRow}
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          {CATEGORIES.map((cat) => {
            const active = cat === category;
            return (
              <Pressable
                accessibilityLabel={`Filter by ${cat}`}
                accessibilityRole="button"
                key={cat}
                onPress={() => setCategory(cat)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text
                  style={[styles.chipText, active && styles.chipTextActive]}
                >
                  {cat}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.grid}>
          {filtered.map((topic) => (
            <Card key={topic.id} style={styles.topicCard}>
              <Text style={styles.topicCategory}>{topic.category}</Text>
              <Text style={styles.topicTitle}>{topic.title}</Text>
              <Pressable
                accessibilityLabel={`Start ${topic.title}`}
                accessibilityRole="button"
                onPress={() => router.push(`/ai-test/record/${topic.id}`)}
                style={styles.startButton}
              >
                <Text style={styles.startButtonText}>Start</Text>
                <Ionicons
                  color={theme.colors.primary}
                  name="arrow-forward"
                  size={14}
                />
              </Pressable>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: rt.insets.top + theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    padding: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
  },
  headerTitle: {
    fontFamily: theme.fontFamily.bodyStrong,
    fontSize: theme.fontSize.lg,
    color: theme.colors.foreground,
  },
  headerRightPlaceholder: {
    width: 32,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: rt.insets.bottom + theme.spacing.xl,
    gap: theme.spacing.lg,
  },
  introBand: {
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    gap: theme.spacing.xs,
    alignItems: "flex-start",
  },
  introIconWrap: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.full,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing.xs,
  },
  introTitle: {
    fontFamily: theme.fontFamily.display,
    fontSize: theme.fontSize["2xl"],
    color: "#FFFFFF",
  },
  introBody: {
    fontFamily: theme.fontFamily.body,
    fontSize: theme.fontSize.sm,
    color: "rgba(255,255,255,0.9)",
  },
  chipRow: {
    gap: theme.spacing.sm,
    marginTop: -theme.spacing.sm,
  },
  chip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs + 2,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.card,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },
  chipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  chipText: {
    fontFamily: theme.fontFamily.label,
    fontSize: theme.fontSize.sm,
    color: theme.colors.foreground,
  },
  chipTextActive: {
    color: "#FFFFFF",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.md,
  },
  topicCard: {
    width: "47%",
    gap: theme.spacing.xs,
  },
  topicCategory: {
    fontFamily: theme.fontFamily.caption,
    fontSize: theme.fontSize.xs,
    color: theme.colors.mutedForeground,
  },
  topicTitle: {
    fontFamily: theme.fontFamily.title,
    fontSize: theme.fontSize.base,
    color: theme.colors.foreground,
    minHeight: theme.fontSize.base * 2.6,
  },
  startButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    marginTop: theme.spacing.xs,
  },
  startButtonText: {
    fontFamily: theme.fontFamily.bodyStrong,
    fontSize: theme.fontSize.sm,
    color: theme.colors.primary,
  },
}));
