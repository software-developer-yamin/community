/*
 * AceFluency / My View
 *
 * THESIS — The streak is a living thing you're building, not a stat you check.
 * OWN-WORLD — Golden Hour Studio: streak gradient chip, progress bars per goal.
 * STORY — See today's two goals → see your network → jump into AI practice.
 * FIRST VIEWPORT — Daily Speaking Streak card with two goal progress bars.
 * FORM — Vertical scroll of Card sections, consistent with Home's grammar.
 */

import { Ionicons } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { Badge, StreakChip } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { SectionHeader } from "@/components/ui/section-header";

const CALLING_GOAL_MIN = 10;
const ROOM_GOAL_MIN = 2;
const CALLING_DONE_MIN = 0;
const ROOM_DONE_MIN = 0;
const STREAK_DAYS = 0;

export default function MyViewScreen() {
  const { theme } = useUnistyles();
  const router = useRouter();

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageTitle}>My View</Text>

        <Card style={styles.streakCard}>
          <View style={styles.streakHeaderRow}>
            <Text style={styles.streakTitle}>Daily Speaking Streak</Text>
            <StreakChip days={STREAK_DAYS} />
          </View>
          <Text style={styles.streakHint}>
            Finish both goals to earn +10 stars
          </Text>

          <View style={styles.goalRow}>
            <View style={styles.goalHeaderRow}>
              <Text style={styles.goalLabel}>Calling</Text>
              <Text style={styles.goalValue}>
                {CALLING_DONE_MIN.toString().padStart(2, "0")}:00 /{" "}
                {CALLING_GOAL_MIN}:00
              </Text>
            </View>
            <ProgressBar progress={CALLING_DONE_MIN / CALLING_GOAL_MIN} />
          </View>

          <View style={styles.goalRow}>
            <View style={styles.goalHeaderRow}>
              <Text style={styles.goalLabel}>Room speaking</Text>
              <Text style={styles.goalValue}>
                {ROOM_DONE_MIN.toString().padStart(2, "0")}:00 / {ROOM_GOAL_MIN}
                :00
              </Text>
            </View>
            <ProgressBar
              gradient="streak"
              progress={ROOM_DONE_MIN / ROOM_GOAL_MIN}
            />
          </View>

          <Button
            onPress={() => router.push("/call/matching")}
            size="md"
            style={styles.streakButton}
          >
            ✨ Complete Today's Streak
          </Button>
        </Card>

        <SectionHeader title="My Network" />
        <View style={styles.networkRow}>
          <Card style={styles.networkCard}>
            <Ionicons
              color={theme.colors.primary}
              name="people-outline"
              size={24}
            />
            <Text style={styles.networkLabel}>My Friends</Text>
          </Card>
          <Card style={styles.networkCard}>
            <Ionicons
              color={theme.colors.primary}
              name="time-outline"
              size={24}
            />
            <Text style={styles.networkLabel}>Call History</Text>
          </Card>
        </View>

        <SectionHeader title="AI Speaking Test" />
        <Card style={styles.aiCard}>
          <View style={styles.aiRow}>
            <View style={styles.aiIconWrap}>
              <Ionicons color="#FFFFFF" name="sparkles" size={22} />
            </View>
            <View style={styles.aiTextWrap}>
              <Text style={styles.aiTitle}>Practise with AI feedback</Text>
              <Text style={styles.aiBody}>32 topics · Instant AI analysis</Text>
            </View>
          </View>
          <Link asChild href="/ai-test">
            <Pressable
              accessibilityLabel="Start AI speaking test"
              accessibilityRole="button"
            >
              <Text style={styles.aiLink}>Start a topic →</Text>
            </Pressable>
          </Link>
        </Card>

        <SectionHeader title="My Communities" />
        <Card style={styles.communityCard}>
          <Badge>English Room</Badge>
          <Text style={styles.communityBody}>
            Practice with a focused group of learners.
          </Text>
        </Card>
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
  streakCard: {
    gap: theme.spacing.md,
  },
  streakHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  streakTitle: {
    fontFamily: theme.fontFamily.title,
    fontSize: theme.fontSize.lg,
    color: theme.colors.foreground,
  },
  streakHint: {
    fontFamily: theme.fontFamily.body,
    fontSize: theme.fontSize.sm,
    color: theme.colors.mutedForeground,
    marginTop: -theme.spacing.sm,
  },
  goalRow: {
    gap: theme.spacing.xs,
  },
  goalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  goalLabel: {
    fontFamily: theme.fontFamily.bodyStrong,
    fontSize: theme.fontSize.sm,
    color: theme.colors.foreground,
  },
  goalValue: {
    fontFamily: theme.fontFamily.caption,
    fontSize: theme.fontSize.xs,
    color: theme.colors.mutedForeground,
  },
  streakButton: {
    marginTop: theme.spacing.xs,
  },
  networkRow: {
    flexDirection: "row",
    gap: theme.spacing.md,
    marginTop: -theme.spacing.sm,
  },
  networkCard: {
    flex: 1,
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  networkLabel: {
    fontFamily: theme.fontFamily.bodyStrong,
    fontSize: theme.fontSize.sm,
    color: theme.colors.foreground,
  },
  aiCard: {
    gap: theme.spacing.md,
    marginTop: -theme.spacing.sm,
  },
  aiRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
  },
  aiIconWrap: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  aiTextWrap: {
    flex: 1,
    gap: 2,
  },
  aiTitle: {
    fontFamily: theme.fontFamily.title,
    fontSize: theme.fontSize.base,
    color: theme.colors.foreground,
  },
  aiBody: {
    fontFamily: theme.fontFamily.caption,
    fontSize: theme.fontSize.xs,
    color: theme.colors.mutedForeground,
  },
  aiLink: {
    fontFamily: theme.fontFamily.bodyStrong,
    fontSize: theme.fontSize.sm,
    color: theme.colors.primary,
  },
  communityCard: {
    gap: theme.spacing.xs,
    marginTop: -theme.spacing.sm,
  },
  communityBody: {
    fontFamily: theme.fontFamily.body,
    fontSize: theme.fontSize.sm,
    color: theme.colors.mutedForeground,
  },
}));
