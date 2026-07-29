/**
 * VoiceClubsDirectory — Topic directory for Voice Clubs surface.
 *
 * THESIS: Search-first directory. Lower friction than browsing 28 rooms blind.
 * OWN-WORLD: Quiet Studio zero-chroma greyscale + hairline-rule structure.
 * STORY: Learner types intent or taps taxonomy chip → matching rooms surface as
 *        one-line hairline-divided rows. Tap row → /call/matching (live queue).
 * FIRST VIEWPORT: Search bar (hairline border, product voice placeholder) +
 *                 horizontal taxonomy chip strip + filtered room list below.
 * FORM: One-line silhouette rows (sneaker-box-stacks grammar fused). No fabricated
 *       active-speaker counts (PRD pain: unfair suspensions from disconnects).
 */

import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

interface TopicRoom {
  id: string;
  name: string;
  subtitle: string;
}

interface TopicCategory {
  id: string;
  label: string;
  rooms: TopicRoom[];
}

const CATEGORIES: TopicCategory[] = [
  {
    id: "tech-interviews",
    label: "Tech interviews",
    rooms: [
      {
        id: "system-design",
        name: "System design practice",
        subtitle: "Whiteboard out loud",
      },
      {
        id: "behavioral-mock",
        name: "Behavioral mock",
        subtitle: "STAR stories rehearsed",
      },
      {
        id: "coding-out-loud",
        name: "Coding out loud",
        subtitle: "Narrate the approach",
      },
      {
        id: "algorithm-story",
        name: "Algorithm story-time",
        subtitle: "Big-O in plain English",
      },
    ],
  },
  {
    id: "small-talk",
    label: "Small talk",
    rooms: [
      {
        id: "coffee-break",
        name: "Coffee break chat",
        subtitle: "Five-minute warm-up",
      },
      {
        id: "weather-weekend",
        name: "Weather & weekend",
        subtitle: "Everyday openers",
      },
      {
        id: "family-friends",
        name: "Family & friends",
        subtitle: "Catching up",
      },
      {
        id: "daily-routines",
        name: "Daily routines",
        subtitle: "Habits & schedules",
      },
    ],
  },
  {
    id: "exam-prep",
    label: "Exam prep",
    rooms: [
      {
        id: "ielts-speaking",
        name: "IELTS speaking",
        subtitle: "Part 2 cue cards",
      },
      {
        id: "toefl-independent",
        name: "TOEFL independent",
        subtitle: "45-second responses",
      },
      {
        id: "duolingo-speed",
        name: "Duolingo speed drill",
        subtitle: "Fast picture talk",
      },
    ],
  },
  {
    id: "music-film",
    label: "Music & film",
    rooms: [
      {
        id: "movie-recap",
        name: "Movie recap",
        subtitle: "Plot in your words",
      },
      {
        id: "song-lyrics",
        name: "Song lyric close-read",
        subtitle: "Decode verses",
      },
      {
        id: "bollywood-dialogues",
        name: "Bollywood dialogues",
        subtitle: "Iconic line practice",
      },
      {
        id: "kpop-fandom",
        name: "K-pop fandom talk",
        subtitle: "Stan vocabulary",
      },
    ],
  },
  {
    id: "travel",
    label: "Travel",
    rooms: [
      {
        id: "airport-survival",
        name: "Airport survival",
        subtitle: "Gate & boarding talk",
      },
      {
        id: "hostel-checkin",
        name: "Hostel check-in",
        subtitle: "Meet a bunkmate",
      },
      {
        id: "food-orders-abroad",
        name: "Food orders abroad",
        subtitle: "Menu & dietary needs",
      },
      {
        id: "asking-directions",
        name: "Asking for directions",
        subtitle: "Landmarks & routes",
      },
    ],
  },
  {
    id: "work-career",
    label: "Work & career",
    rooms: [
      {
        id: "standup-practice",
        name: "Standup practice",
        subtitle: "Yesterday/today/blockers",
      },
      {
        id: "one-on-one",
        name: "1:1 with manager",
        subtitle: "Agenda & feedback",
      },
      {
        id: "salary-negotiation",
        name: "Salary negotiation",
        subtitle: "Anchor & counter",
      },
      {
        id: "exit-interview",
        name: "Exit interview",
        subtitle: "Honest closing thoughts",
      },
    ],
  },
  {
    id: "local-english",
    label: "Local English",
    rooms: [
      {
        id: "dhaka-marketplace",
        name: "Dhaka marketplace",
        subtitle: "Bargain & banter",
      },
      {
        id: "bangalore-tech-park",
        name: "Bangalore tech park",
        subtitle: "Lunch crowd small talk",
      },
      {
        id: "karachi-office",
        name: "Karachi office",
        subtitle: "Desk-neighbor chat",
      },
      {
        id: "colombo-tea-shop",
        name: "Colombo tea shop",
        subtitle: "Order & linger",
      },
    ],
  },
];

interface FlattenedRoom extends TopicRoom {
  categoryLabel: string;
}

const FLATTENED: FlattenedRoom[] = (() => {
  const list: FlattenedRoom[] = [];
  for (const cat of CATEGORIES) {
    for (const room of cat.rooms) {
      list.push({ ...room, categoryLabel: cat.label });
    }
  }
  return list;
})();

export function VoiceClubsDirectory() {
  const theme = useUnistyles().theme;
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filteredRooms = useMemo(() => {
    const q = query.trim().toLowerCase();
    return FLATTENED.filter((room) => {
      const matchesQuery =
        q === "" ||
        room.name.toLowerCase().includes(q) ||
        room.subtitle.toLowerCase().includes(q) ||
        room.categoryLabel.toLowerCase().includes(q);
      const matchesCategory =
        activeCategory === null ||
        CATEGORIES.some(
          (cat) =>
            cat.id === activeCategory && cat.rooms.some((r) => r.id === room.id)
        );
      return matchesQuery && matchesCategory;
    });
  }, [query, activeCategory]);

  const handleSelectRoom = () => {
    router.push("/call/matching");
  };

  const handlePickCategory = (id: string) => {
    setActiveCategory((current) => (current === id ? null : id));
  };

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.searchRow}>
        <TextInput
          accessibilityHint="Type a room name or topic"
          accessibilityLabel="Search topic rooms"
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={setQuery}
          placeholder="Find a topic room"
          placeholderTextColor={theme.colors.mutedForeground}
          style={styles.searchInput}
          value={query}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.chipStrip}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <Pressable
              accessibilityHint={`Filter rooms under ${cat.label}`}
              accessibilityLabel={cat.label}
              accessibilityRole="button"
              key={cat.id}
              onPress={() => handlePickCategory(cat.id)}
              style={({ pressed }) => [
                styles.chip,
                isActive && styles.chipActive,
                pressed && styles.chipPressed,
              ]}
            >
              <Text
                style={[styles.chipText, isActive && styles.chipTextActive]}
              >
                {cat.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.resultSection}>
        <Text style={styles.resultHeader}>
          {(() => {
            if (filteredRooms.length === 0) {
              return "No rooms match — pick a topic above or search by name.";
            }
            if (filteredRooms.length === 1) {
              return "1 room";
            }
            return `${filteredRooms.length} rooms`;
          })()}
        </Text>

        <View style={styles.roomList}>
          {(() => {
            if (filteredRooms.length === 0) {
              return (
                <View style={styles.emptyWrap}>
                  <Text style={styles.emptyText}>
                    Pick a topic above or search by name.
                  </Text>
                </View>
              );
            }
            return filteredRooms.map((room) => (
              <Pressable
                accessibilityHint={`Join ${room.name}`}
                accessibilityLabel={room.name}
                accessibilityRole="button"
                key={room.id}
                onPress={handleSelectRoom}
                style={({ pressed }) => [
                  styles.roomRow,
                  pressed && styles.roomRowPressed,
                ]}
              >
                <View style={styles.roomMeta}>
                  <Text numberOfLines={1} style={styles.roomName}>
                    {room.name}
                  </Text>
                  <Text numberOfLines={1} style={styles.roomSubtitle}>
                    {room.subtitle}
                  </Text>
                </View>
                <Text style={styles.roomCategory}>{room.categoryLabel}</Text>
              </Pressable>
            ));
          })()}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create((theme) => ({
  scrollContent: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
    gap: theme.spacing.md,
  },
  searchRow: {
    flexDirection: "row",
  },
  searchInput: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    color: theme.colors.foreground,
    fontSize: theme.fontSize.base,
    backgroundColor: theme.colors.card,
  },
  chipStrip: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  chip: {
    minHeight: 36,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.background,
    justifyContent: "center",
  },
  chipActive: {
    borderColor: theme.colors.foreground,
    backgroundColor: theme.colors.primary,
  },
  chipPressed: {
    opacity: 0.7,
  },
  chipText: {
    color: theme.colors.foreground,
    fontSize: theme.fontSize.sm,
    fontWeight: "500",
  },
  chipTextActive: {
    color: theme.colors.primaryForeground,
  },
  resultSection: {
    gap: theme.spacing.sm,
  },
  resultHeader: {
    color: theme.colors.mutedForeground,
    fontSize: theme.fontSize.sm,
    fontWeight: "500",
    letterSpacing: 0.2,
  },
  roomList: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.card,
    overflow: "hidden",
  },
  roomRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 56,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    gap: theme.spacing.sm,
  },
  roomRowPressed: {
    backgroundColor: theme.colors.accent,
  },
  roomMeta: {
    flex: 1,
    gap: 2,
  },
  roomName: {
    color: theme.colors.foreground,
    fontSize: theme.fontSize.base,
    fontWeight: "600",
  },
  roomSubtitle: {
    color: theme.colors.mutedForeground,
    fontSize: theme.fontSize.xs,
  },
  roomCategory: {
    color: theme.colors.mutedForeground,
    fontSize: theme.fontSize.xs,
    fontWeight: "500",
    letterSpacing: 0.2,
  },
  emptyWrap: {
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.card,
    alignItems: "center",
  },
  emptyText: {
    color: theme.colors.mutedForeground,
    fontSize: theme.fontSize.base,
    textAlign: "center",
  },
}));
