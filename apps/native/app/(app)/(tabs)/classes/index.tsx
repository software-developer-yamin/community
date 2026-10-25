/*
 * AceFluency / Classes
 *
 * THESIS — Trust before booking: a real tutor face, rating, and next slot,
 *   not an abstract calendar.
 * OWN-WORLD — Golden Hour Studio: Cambly/italki-register trainer cards.
 * STORY — See the coaching offer → search & filter trainers → see bookable
 *   trainers with real credentials → see your upcoming classes.
 * FIRST VIEWPORT — Personal coaching card with a ₹99 trial hook.
 * FORM — Vertical scroll of Card sections and trainer marketplace discovery.
 */

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { TrainerCard } from "@/components/trainer-card";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeader } from "@/components/ui/section-header";
import {
  ILLUSTRATIVE_TRAINERS,
  type Trainer,
} from "@/lib/illustrative-trainers";

const TOPIC_CHIPS = [
  "All",
  "IELTS",
  "Daily English",
  "Business",
  "Pronunciation",
] as const;

type Topic = (typeof TOPIC_CHIPS)[number];

function matchesTopicSpecialty(spec: string, topicLower: string): boolean {
  if (topicLower === "ielts") {
    return spec.includes("ielts");
  }
  if (topicLower === "daily english") {
    return (
      spec.includes("conversation") ||
      spec.includes("daily") ||
      spec.includes("grammar") ||
      spec.includes("vocabulary")
    );
  }
  if (topicLower === "business") {
    return (
      spec.includes("interview") ||
      spec.includes("business") ||
      spec.includes("public speaking")
    );
  }
  if (topicLower === "pronunciation") {
    return (
      spec.includes("pronunciation") ||
      spec.includes("speech") ||
      spec.includes("accent")
    );
  }
  return spec.includes(topicLower);
}

function matchesTopicBio(bio: string, topicLower: string): boolean {
  if (topicLower === "ielts") {
    return bio.includes("ielts");
  }
  if (topicLower === "daily english") {
    return (
      bio.includes("conversation") ||
      bio.includes("daily") ||
      bio.includes("everyday")
    );
  }
  if (topicLower === "business") {
    return (
      bio.includes("interview") ||
      bio.includes("job") ||
      bio.includes("business")
    );
  }
  if (topicLower === "pronunciation") {
    return bio.includes("pronunciation") || bio.includes("articulation");
  }
  return bio.includes(topicLower);
}

function matchesTopic(trainer: Trainer, topic: Topic): boolean {
  if (topic === "All") {
    return true;
  }
  const topicLower = topic.toLowerCase();
  const hasSpecialty = trainer.specialties.some((s) =>
    matchesTopicSpecialty(s.toLowerCase(), topicLower)
  );
  if (hasSpecialty) {
    return true;
  }
  return matchesTopicBio(trainer.bio.toLowerCase(), topicLower);
}

export default function ClassesScreen() {
  const { theme } = useUnistyles();
  const [selectedTopic, setSelectedTopic] = useState<Topic>("All");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredTrainers = useMemo(() => {
    return ILLUSTRATIVE_TRAINERS.filter((trainer: Trainer) => {
      if (!matchesTopic(trainer, selectedTopic)) {
        return false;
      }

      // Text search query across name, specialties, languages, and bio
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchesName = trainer.name.toLowerCase().includes(q);
        const matchesSpecialty = trainer.specialties.some((s) =>
          s.toLowerCase().includes(q)
        );
        const matchesLanguage = trainer.languages.some((l) =>
          l.toLowerCase().includes(q)
        );
        const matchesBio = trainer.bio.toLowerCase().includes(q);

        return matchesName || matchesSpecialty || matchesLanguage || matchesBio;
      }

      return true;
    });
  }, [selectedTopic, searchQuery]);

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageTitle}>Classes</Text>

        {/* 1. Personal coaching card with ₹99 trial hook */}
        <LinearGradient
          colors={theme.gradients.practice}
          end={{ x: 1, y: 1 }}
          start={{ x: 0, y: 0 }}
          style={[styles.coachingCard, theme.shadow.cta]}
        >
          <View style={styles.coachingBadgeRow}>
            <Badge>at just ₹99</Badge>
            <View style={styles.coachingOfferPill}>
              <Ionicons color="#FFFFFF" name="flash" size={12} />
              <Text style={styles.coachingOfferText}>1st trial offer</Text>
            </View>
          </View>
          <Text style={styles.coachingTitle}>1-on-1 English classes</Text>
          <Text style={styles.coachingBody}>
            Expert trainer · Flexible timing · Live 1-on-1
          </Text>
          <View style={styles.coachingPerks}>
            <View style={styles.coachingPerkItem}>
              <Ionicons
                color="#FFFFFF"
                name="checkmark-circle-outline"
                size={14}
              />
              <Text style={styles.coachingPerkText}>
                Verified Cambridge &amp; TESOL trainers
              </Text>
            </View>
            <View style={styles.coachingPerkItem}>
              <Ionicons
                color="#FFFFFF"
                name="checkmark-circle-outline"
                size={14}
              />
              <Text style={styles.coachingPerkText}>
                Personalized speaking roadmap &amp; feedback
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* 2. Search input */}
        <View style={styles.searchContainer}>
          <Ionicons
            color={theme.colors.mutedForeground}
            name="search"
            size={18}
            style={styles.searchIcon}
          />
          <TextInput
            accessibilityLabel="Search trainers, skills, or topics"
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
            onChangeText={setSearchQuery}
            placeholder="Search trainers, skills, or topics..."
            placeholderTextColor={theme.colors.mutedForeground}
            style={styles.searchInput}
            value={searchQuery}
          />
          {searchQuery.length > 0 ? (
            <Pressable
              accessibilityLabel="Clear search"
              accessibilityRole="button"
              onPress={() => setSearchQuery("")}
              style={styles.clearButton}
            >
              <Ionicons
                color={theme.colors.mutedForeground}
                name="close-circle"
                size={18}
              />
            </Pressable>
          ) : null}
        </View>

        {/* 3. Interactive topic filter chips */}
        <View style={styles.topicsSection}>
          <ScrollView
            contentContainerStyle={styles.topicsScrollContent}
            horizontal
            showsHorizontalScrollIndicator={false}
          >
            {TOPIC_CHIPS.map((topic) => {
              const isSelected = selectedTopic === topic;
              return (
                <Pressable
                  accessibilityLabel={`Filter by ${topic}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  key={topic}
                  onPress={() =>
                    setSelectedTopic(selectedTopic === topic ? "All" : topic)
                  }
                  style={[
                    styles.topicChip,
                    isSelected && styles.topicChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.topicChipText,
                      isSelected && styles.topicChipTextActive,
                    ]}
                  >
                    {topic}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* 4. Trainer cards list */}
        <SectionHeader
          title={
            selectedTopic === "All"
              ? "Available trainers"
              : `${selectedTopic} trainers (${filteredTrainers.length})`
          }
        />
        <View style={styles.trainersList}>
          {filteredTrainers.length > 0 ? (
            filteredTrainers.map((trainer) => (
              <TrainerCard
                key={trainer.id}
                onBook={() => undefined}
                onPress={() => undefined}
                trainer={trainer}
              />
            ))
          ) : (
            <Card>
              <EmptyState
                actionLabel="Clear search & filters"
                body="No trainers found matching your criteria. Try adjusting your search query or topic filter."
                emoji="🔍"
                onAction={() => {
                  setSearchQuery("");
                  setSelectedTopic("All");
                }}
                title="No trainers found"
              />
            </Card>
          )}
        </View>

        {/* 5. Upcoming classes section with EmptyState fallback */}
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
    gap: theme.spacing.md,
    alignItems: "flex-start",
  },
  coachingBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  coachingOfferPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.full,
  },
  coachingOfferText: {
    fontFamily: theme.fontFamily.caption,
    fontSize: theme.fontSize.xs,
    color: "#FFFFFF",
  },
  coachingTitle: {
    fontFamily: theme.fontFamily.display,
    fontSize: theme.fontSize["2xl"],
    color: "#FFFFFF",
  },
  coachingBody: {
    fontFamily: theme.fontFamily.body,
    fontSize: theme.fontSize.sm,
    color: "rgba(255, 255, 255, 0.9)",
  },
  coachingPerks: {
    gap: theme.spacing.xs,
    width: "100%",
  },
  coachingPerkItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
  },
  coachingPerkText: {
    fontFamily: theme.fontFamily.body,
    fontSize: theme.fontSize.xs,
    color: "rgba(255, 255, 255, 0.9)",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    height: 48,
    gap: theme.spacing.sm,
  },
  searchIcon: {
    marginRight: 2,
  },
  searchInput: {
    flex: 1,
    fontFamily: theme.fontFamily.body,
    fontSize: theme.fontSize.sm,
    color: theme.colors.foreground,
    paddingVertical: 0,
  },
  clearButton: {
    padding: theme.spacing.xs,
  },
  topicsSection: {
    marginHorizontal: -theme.spacing.lg,
  },
  topicsScrollContent: {
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  topicChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  topicChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  topicChipText: {
    fontFamily: theme.fontFamily.label,
    fontSize: theme.fontSize.xs,
    color: theme.colors.mutedForeground,
  },
  topicChipTextActive: {
    color: theme.colors.primaryForeground,
  },
  trainersList: {
    gap: theme.spacing.md,
  },
}));
