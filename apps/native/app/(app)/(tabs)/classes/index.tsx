/*
 * AceFluency / Classes
 *
 * THESIS — Trust before booking: a real tutor face, rating, and next slot,
 *   not an abstract calendar.
 * OWN-WORLD — Golden Hour Studio: Cambly/italki-register trainer cards.
 * STORY — See the coaching offer → see a bookable tutor → see your upcoming
 *   classes.
 * FIRST VIEWPORT — Personal coaching card with a ₹99 trial hook.
 * FORM — Vertical scroll of Card sections.
 */

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { ScrollView, Text, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeader } from "@/components/ui/section-header";

// Illustrative until the trainer-marketplace endpoint lands
// (ARCHITECTURE.md §2.4, Phase 2).
const TRIAL_TUTOR = {
  name: "Raj",
  rating: "4.9",
  nextSlot: "8:00 AM · Today",
};

export default function ClassesScreen() {
  const { theme } = useUnistyles();

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageTitle}>Classes</Text>

        <LinearGradient
          colors={theme.gradients.practice}
          end={{ x: 1, y: 1 }}
          start={{ x: 0, y: 0 }}
          style={[styles.coachingCard, theme.shadow.cta]}
        >
          <Badge>at just ₹99</Badge>
          <Text style={styles.coachingTitle}>1-on-1 English classes</Text>
          <Text style={styles.coachingBody}>
            Expert trainer · Flexible timing · Live 1-on-1
          </Text>
        </LinearGradient>

        <SectionHeader title="Book a trial class @ ₹99" />
        <Card style={styles.tutorCard}>
          <Avatar name={TRIAL_TUTOR.name} size="lg" />
          <View style={styles.tutorMeta}>
            <Text style={styles.tutorName}>{TRIAL_TUTOR.name}</Text>
            <View style={styles.tutorRatingRow}>
              <Ionicons color={theme.colors.aurum} name="star" size={14} />
              <Text style={styles.tutorRating}>{TRIAL_TUTOR.rating}</Text>
              <Text style={styles.tutorSlot}>· {TRIAL_TUTOR.nextSlot}</Text>
            </View>
          </View>
          <Button fullWidth={false} size="md" variant="secondary">
            Book
          </Button>
        </Card>

        <SectionHeader title="Upcoming classes" />
        <Card>
          <EmptyState
            actionLabel="Schedule a trainer"
            body="Book a class to continue your learning journey!"
            emoji="📅"
            title="No upcoming classes"
          />
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
  coachingCard: {
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
    alignItems: "flex-start",
  },
  coachingTitle: {
    fontFamily: theme.fontFamily.display,
    fontSize: theme.fontSize["2xl"],
    color: "#FFFFFF",
  },
  coachingBody: {
    fontFamily: theme.fontFamily.body,
    fontSize: theme.fontSize.sm,
    color: "rgba(255,255,255,0.9)",
  },
  tutorCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    marginTop: -theme.spacing.sm,
  },
  tutorMeta: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  tutorName: {
    fontFamily: theme.fontFamily.title,
    fontSize: theme.fontSize.base,
    color: theme.colors.foreground,
  },
  tutorRatingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  tutorRating: {
    fontFamily: theme.fontFamily.caption,
    fontSize: theme.fontSize.xs,
    color: theme.colors.mutedForeground,
  },
  tutorSlot: {
    fontFamily: theme.fontFamily.caption,
    fontSize: theme.fontSize.xs,
    color: theme.colors.mutedForeground,
  },
}));
