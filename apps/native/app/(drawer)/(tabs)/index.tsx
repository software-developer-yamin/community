/*
 * AceFluency / Practice Home
 *
 * THESIS — Quiet first viewport: convert "I should practice" into "I'm about
 *   to talk to someone" without theater.
 * OWN-WORLD — Quiet Studio: zero-chroma ink on paper, hairline-rule structure,
 *   sharp destructive tint, native status colors as data only.
 * STORY — Open the app → see how far you've come this week → see who is ready
 *   to talk now → one tap and you're in the queue.
 * FIRST VIEWPORT — Streak + talk-time bands on the upper third; beneath them
 *   one sharp "Find a partner now" action and the first matched card.
 * FORM — Far / midplane / foreground parallax on a single vertical axis.
 */

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { Container } from "@/components/container";
import { orpc } from "@/utils/orpc";

interface Partner {
  cefr: null | string;
  id: string;
  image: null | string;
  name: string;
  sim: number;
}

interface MatchData {
  partners: Partner[];
  reason?: string;
}

function isPartner(value: unknown): value is Partner {
  if (!value || typeof value !== "object") {
    return false;
  }
  const p = value as Record<string, unknown>;
  return (
    typeof p.id === "string" &&
    typeof p.name === "string" &&
    (p.cefr === null || typeof p.cefr === "string") &&
    (p.image === null || typeof p.image === "string") &&
    typeof p.sim === "number"
  );
}

function readMatchData(data: unknown): MatchData | null {
  if (!data || typeof data !== "object") {
    return null;
  }
  const candidate = data as Record<string, unknown>;
  const partners = Array.isArray(candidate.partners)
    ? candidate.partners.filter(isPartner)
    : [];
  const reason =
    typeof candidate.reason === "string" ? candidate.reason : undefined;
  return { partners, reason };
}

const STREAK_DAYS = 7;
const DAILY_GOAL_FALLBACK_MIN = 10;
const TODAY_TALK_PLACEHOLDER_MIN = 0;
const MATCH_PULL_MS = 30_000;
const HEADER_INTERP_RANGE = 240;
const PARTNER_CARDS_PREVIEW = 5;

export default function Home() {
  const { theme } = useUnistyles();
  const router = useRouter();
  const scrollY = useRef(new Animated.Value(0)).current;

  const matchQuery = useQuery({
    ...orpc.models.matchPartners.queryOptions({ input: { limit: 10 } }),
    refetchInterval: MATCH_PULL_MS,
  });
  const matchData = readMatchData(matchQuery.data);
  const partners = matchData?.partners ?? [];
  const noEmbedding = matchData?.reason === "no_embedding";
  const isLoading = matchQuery.isLoading && !matchQuery.data;
  const refreshing = matchQuery.isRefetching && !matchQuery.isLoading;

  const handleFindPartner = useCallback(() => {
    router.push("/call/matching");
  }, [router]);

  const handleRefresh = useCallback(() => {
    matchQuery.refetch();
  }, [matchQuery]);

  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: true }
  );

  const streakTranslateY = scrollY.interpolate({
    inputRange: [0, HEADER_INTERP_RANGE],
    outputRange: [0, 60],
    extrapolate: "clamp",
  });
  const talkTranslateY = scrollY.interpolate({
    inputRange: [0, HEADER_INTERP_RANGE],
    outputRange: [0, 24],
    extrapolate: "clamp",
  });

  const talkSummaryText = `${TODAY_TALK_PLACEHOLDER_MIN} of ${DAILY_GOAL_FALLBACK_MIN} min`;
  const progressPct =
    Math.min(TODAY_TALK_PLACEHOLDER_MIN / DAILY_GOAL_FALLBACK_MIN, 1) * 100;

  const todayIdx = new Date().getDay();
  const weekdays = useMemo(() => ["S", "M", "T", "W", "T", "F", "S"], []);
  const cells = useMemo(
    () => Array.from({ length: STREAK_DAYS }, (_, i) => i),
    []
  );

  return (
    <Container>
      <Animated.ScrollView
        contentContainerStyle={styles.scrollContent}
        onScroll={onScroll}
        refreshControl={
          <RefreshControl
            colors={[theme.colors.mutedForeground]}
            onRefresh={handleRefresh}
            refreshing={refreshing}
            tintColor={theme.colors.mutedForeground}
            title="Refreshing…"
            titleColor={theme.colors.mutedForeground}
          />
        }
        scrollEventThrottle={16}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.pageTitle}>Practice</Text>
            <Text style={styles.pageSub}>Ready when you are.</Text>
          </View>
          <View style={styles.cefrPill}>
            <Text style={styles.cefrPillText}>A2</Text>
          </View>
        </View>

        <Animated.View
          style={[
            styles.streakBand,
            { transform: [{ translateY: streakTranslateY }] },
          ]}
        >
          <View style={styles.streakHeaderRow}>
            <Text style={styles.sectionLabel}>Streak</Text>
            <Text style={styles.streakValue}>0 days</Text>
          </View>
          <View style={styles.streakGrid}>
            {cells.map((i) => {
              const isToday = i === todayIdx;
              return (
                <View
                  key={`streak-cell-${i}`}
                  style={[styles.streakCell, isToday && styles.streakCellToday]}
                >
                  <Text style={styles.streakCellLabel}>{weekdays[i]}</Text>
                </View>
              );
            })}
          </View>
          <Text style={styles.streakHint}>
            Your speaking journey starts tonight.
          </Text>
        </Animated.View>

        <Animated.View
          style={[
            styles.talkBand,
            { transform: [{ translateY: talkTranslateY }] },
          ]}
        >
          <View style={styles.talkHeaderRow}>
            <Text style={styles.sectionLabel}>Today&apos;s talk time</Text>
            <Text style={styles.talkSummary}>{talkSummaryText}</Text>
          </View>
          <View style={styles.talkProgressTrack}>
            <View
              style={[styles.talkProgressFill, { width: `${progressPct}%` }]}
            />
          </View>
          <Text style={styles.talkHint}>
            Tap &quot;Find a partner now&quot; to clock your first minutes.
          </Text>
        </Animated.View>

        <Pressable
          accessibilityHint="Opens the matching queue to find a 1-on-1 voice partner."
          accessibilityLabel="Find a partner now"
          accessibilityRole="button"
          onPress={handleFindPartner}
          style={({ pressed }) => [
            styles.primaryCTA,
            pressed && styles.primaryCTAPressed,
          ]}
        >
          <Text style={styles.primaryCTALabel}>Find a partner now</Text>
        </Pressable>

        <View style={styles.cardsSectionHeader}>
          <Text style={styles.sectionLabel}>Partners matched now</Text>
        </View>

        <View style={styles.cardsList}>
          {(() => {
            if (isLoading) {
              return (
                <View style={styles.loadingWrap}>
                  <ActivityIndicator color={theme.colors.mutedForeground} />
                  <Text style={styles.loadingText}>
                    Looking for level-matched partners…
                  </Text>
                </View>
              );
            }
            if (noEmbedding) {
              return (
                <View style={styles.emptyWrap}>
                  <Text style={styles.emptyTitle}>
                    Build your profile first
                  </Text>
                  <Text style={styles.emptyBody}>
                    Update your speaking level and interests so AceFluency can
                    match you with practice partners near your level.
                  </Text>
                </View>
              );
            }
            if (partners.length === 0) {
              return (
                <View style={styles.emptyWrap}>
                  <Text style={styles.emptyTitle}>No one ready right now</Text>
                  <Text style={styles.emptyBody}>
                    Try again in a minute, or open the matching queue to be
                    placed in line.
                  </Text>
                </View>
              );
            }
            return partners.slice(0, PARTNER_CARDS_PREVIEW).map((partner) => {
              const initial = partner.name.charAt(0).toUpperCase() || "?";
              const simPct = Math.round(partner.sim * 100);
              return (
                <Pressable
                  accessibilityHint="Opens the matching queue to call someone near your level."
                  accessibilityLabel={`Start a call with ${partner.name}`}
                  accessibilityRole="button"
                  key={partner.id}
                  onPress={handleFindPartner}
                  style={({ pressed }) => [
                    styles.partnerCard,
                    pressed && styles.partnerCardPressed,
                  ]}
                >
                  <View style={styles.partnerAvatar}>
                    <Text style={styles.partnerInitial}>{initial}</Text>
                  </View>
                  <View style={styles.partnerMeta}>
                    <Text numberOfLines={1} style={styles.partnerName}>
                      {partner.name}
                    </Text>
                    <View style={styles.partnerTagsRow}>
                      <Text style={styles.cefrBadgeText}>
                        {partner.cefr ?? "—"}
                      </Text>
                      <View style={styles.dotSep} />
                      <Text style={styles.partnerSimText}>{simPct}% match</Text>
                    </View>
                  </View>
                </Pressable>
              );
            });
          })()}
        </View>
      </Animated.ScrollView>
    </Container>
  );
}

const styles = StyleSheet.create((theme) => ({
  scrollContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl + theme.spacing.lg,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: theme.spacing.lg,
  },
  pageTitle: {
    fontSize: theme.fontSize["3xl"],
    fontWeight: "700",
    color: theme.colors.foreground,
    letterSpacing: -0.5,
    lineHeight: theme.fontSize["3xl"] * 1.1,
    marginBottom: theme.spacing.xs,
  },
  pageSub: {
    fontSize: theme.fontSize.base,
    color: theme.colors.mutedForeground,
  },
  cefrPill: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    minHeight: 32,
    justifyContent: "center",
  },
  cefrPillText: {
    fontSize: theme.fontSize.xs,
    fontWeight: "600",
    color: theme.colors.mutedForeground,
  },
  sectionLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: "600",
    color: theme.colors.mutedForeground,
  },
  streakBand: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  streakHeaderRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: theme.spacing.md,
  },
  streakValue: {
    fontSize: theme.fontSize["2xl"],
    fontWeight: "700",
    color: theme.colors.foreground,
  },
  streakGrid: {
    flexDirection: "row",
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.md,
  },
  streakCell: {
    flex: 1,
    aspectRatio: "1 / 1",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  streakCellToday: {
    borderWidth: 2,
    borderColor: theme.colors.ring,
  },
  streakCellLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.mutedForeground,
    fontWeight: "600",
  },
  streakHint: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.mutedForeground,
  },
  talkBand: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  talkHeaderRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: theme.spacing.sm,
  },
  talkSummary: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.foreground,
    fontWeight: "600",
  },
  talkProgressTrack: {
    height: 4,
    backgroundColor: theme.colors.accent,
    borderRadius: theme.borderRadius.full,
    overflow: "hidden",
    marginBottom: theme.spacing.sm,
  },
  talkProgressFill: {
    height: "100%",
    backgroundColor: theme.colors.primary,
  },
  talkHint: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.mutedForeground,
  },
  primaryCTA: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.none,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    marginBottom: theme.spacing.lg,
  },
  primaryCTAPressed: {
    opacity: 0.85,
  },
  primaryCTALabel: {
    fontSize: theme.fontSize.base,
    fontWeight: "600",
    color: theme.colors.primaryForeground,
    letterSpacing: 0.2,
  },
  cardsSectionHeader: {
    marginBottom: theme.spacing.md,
  },
  cardsList: {
    gap: theme.spacing.md,
  },
  partnerCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    minHeight: 80,
  },
  partnerCardPressed: {
    opacity: 0.85,
  },
  partnerAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: theme.spacing.md,
  },
  partnerInitial: {
    fontSize: theme.fontSize["2xl"],
    fontWeight: "700",
    color: theme.colors.primaryForeground,
  },
  partnerMeta: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  partnerName: {
    fontSize: theme.fontSize.lg,
    fontWeight: "600",
    color: theme.colors.foreground,
  },
  partnerTagsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  cefrBadgeText: {
    fontSize: theme.fontSize.xs,
    fontWeight: "600",
    color: theme.colors.mutedForeground,
  },
  dotSep: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: theme.colors.mutedForeground,
  },
  partnerSimText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.mutedForeground,
  },
  loadingWrap: {
    padding: theme.spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 96,
    gap: theme.spacing.sm,
  },
  loadingText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.mutedForeground,
  },
  emptyWrap: {
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.sm,
  },
  emptyTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: "600",
    color: theme.colors.foreground,
    textAlign: "center",
  },
  emptyBody: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.mutedForeground,
    textAlign: "center",
    lineHeight: theme.fontSize.base * 1.5,
  },
}));
