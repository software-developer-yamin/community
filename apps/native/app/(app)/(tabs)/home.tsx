/*
 * AceFluency / Home
 *
 * THESIS — The mechanism is a live human on the other end; this screen should
 *   feel like walking into a warm, busy studio, not opening a stats sheet.
 * OWN-WORLD — Golden Hour Studio: cream Learn register, one Practice-Gradient
 *   CTA bigger than anything else on the screen, warm-tinted card shadows.
 * STORY — See your streak as something alive → see who's live right now →
 *   one gradient tap into a call.
 * FIRST VIEWPORT — Header (avatar/greeting/streak/pro/inbox) → live banner →
 *   the single largest element: the gradient "Talk now" card.
 * FORM — Vertical scroll, gradient CTA as the unmistakable focal point.
 */

import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { Link, useRouter } from "expo-router";
import { useCallback, useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { Avatar } from "@/components/ui/avatar";
import { Badge, LiveDot, ProBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeader } from "@/components/ui/section-header";
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

const MATCH_PULL_MS = 30_000;
const PARTNER_CARDS_PREVIEW = 4;

export default function Home() {
  const { theme } = useUnistyles();
  const router = useRouter();

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

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    const morningEnd = 12;
    const afternoonEnd = 18;
    if (hour < morningEnd) {
      return "Good morning";
    }
    if (hour < afternoonEnd) {
      return "Good afternoon";
    }
    return "Good evening";
  }, []);

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            colors={[theme.colors.primary]}
            onRefresh={handleRefresh}
            refreshing={refreshing}
            tintColor={theme.colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Avatar name="You" ring="streak" size="md" />
            <View>
              <Text style={styles.greeting}>{greeting} 👋</Text>
              {/* Streaks need a stored streak; none exists yet, so the chip is
                  withheld rather than pinned at a permanent zero. */}
            </View>
          </View>
          <View style={styles.headerRight}>
            <Link asChild href="/(app)/subscription">
              <Pressable
                accessibilityLabel="Get Pro"
                accessibilityRole="button"
              >
                <ProBadge />
              </Pressable>
            </Link>
            <Pressable
              accessibilityLabel="Messages"
              accessibilityRole="button"
              hitSlop={8}
              style={styles.iconButton}
            >
              <Ionicons
                color={theme.colors.foreground}
                name="chatbubble-outline"
                size={22}
              />
            </Pressable>
            <Pressable
              accessibilityLabel="Notifications"
              accessibilityRole="button"
              hitSlop={8}
              style={styles.iconButton}
            >
              <Ionicons
                color={theme.colors.foreground}
                name="notifications-outline"
                size={22}
              />
            </Pressable>
          </View>
        </View>

        {/* Live discussion banner */}
        <Card style={styles.liveBanner}>
          <View style={styles.liveBannerRow}>
            <LiveDot label="LIVE NOW" />
            <Text style={styles.liveBannerTitle}>Group Discussions</Text>
          </View>
          <Text style={styles.liveBannerBody}>
            Join a live conversation happening right now.
          </Text>
        </Card>

        {/* Primary CTA — speaking practice */}
        <Pressable
          accessibilityHint="Opens the matching queue to find a 1-on-1 voice partner."
          accessibilityLabel="Talk now"
          accessibilityRole="button"
          onPress={handleFindPartner}
        >
          <LinearGradient
            colors={theme.gradients.practice}
            end={{ x: 1, y: 1 }}
            start={{ x: 0, y: 0 }}
            style={[styles.ctaCard, theme.shadow.cta]}
          >
            <View style={styles.ctaTextWrap}>
              <Text style={styles.ctaEyebrow}>SPEAKING PRACTICE</Text>
              <Text style={styles.ctaTitle}>Talk now</Text>
              <Text style={styles.ctaBody}>
                Get matched with a co-learner in seconds.
              </Text>
            </View>
            <View style={styles.ctaIconWrap}>
              <Ionicons color="#FFFFFF" name="mic" size={28} />
            </View>
          </LinearGradient>
        </Pressable>

        {/* Talk time needs a recorded per-day total; nothing stores one yet, so the
            card is withheld rather than showing a progress bar stuck at zero. */}

        {/* Advanced learner practice */}
        <Card style={styles.advancedCard}>
          <View style={styles.advancedRow}>
            <Badge>ADVANCED</Badge>
            <Text style={styles.advancedEligibility}>4:30 PM – 11:30 PM</Text>
          </View>
          <Text style={styles.advancedTitle}>
            Practice with advanced speakers
          </Text>
          <Text style={styles.advancedBody}>
            Available to learners with a friendliness rating of 2.5+ and an
            active plan.
          </Text>
          <Pressable
            accessibilityLabel="Talk with advanced learners"
            accessibilityRole="button"
            onPress={handleFindPartner}
            style={styles.advancedButton}
          >
            <Text style={styles.advancedButtonText}>Talk Now</Text>
            <Ionicons
              color={theme.colors.primary}
              name="arrow-forward"
              size={16}
            />
          </Pressable>
        </Card>

        {/* Partners matched now */}
        <SectionHeader title="Ready to talk now" />
        <View style={styles.cardsList}>
          {(() => {
            if (isLoading) {
              return (
                <View style={styles.loadingWrap}>
                  <ActivityIndicator color={theme.colors.primary} />
                  <Text style={styles.loadingText}>
                    Looking for level-matched partners…
                  </Text>
                </View>
              );
            }
            if (matchQuery.isError) {
              // Without this, a failed poll falls through to the empty state and
              // tells the user nobody is available when the truth is unknown.
              return (
                <EmptyState
                  actionLabel="Try again"
                  body="We could not check who is available. Check your connection and try again."
                  emoji="📡"
                  onAction={() => matchQuery.refetch()}
                  title="Could not load partners"
                />
              );
            }
            if (noEmbedding) {
              return (
                <EmptyState
                  body="Update your speaking level and interests so AceFluency can match you with practice partners near your level."
                  emoji="🧭"
                  title="Build your profile first"
                />
              );
            }
            if (partners.length === 0) {
              return (
                <EmptyState
                  body="Try again in a minute, or open the matching queue to be placed in line."
                  emoji="🌙"
                  title="No one ready right now"
                />
              );
            }
            return partners.slice(0, PARTNER_CARDS_PREVIEW).map((partner) => {
              const simPct = Math.round(partner.sim * 100);
              return (
                <Card
                  accessibilityLabel={`Start a call with ${partner.name}`}
                  key={partner.id}
                  onPress={handleFindPartner}
                  style={styles.partnerCard}
                >
                  <Avatar name={partner.name} ring="live" size="md" />
                  <View style={styles.partnerMeta}>
                    <Text numberOfLines={1} style={styles.partnerName}>
                      {partner.name}
                    </Text>
                    <View style={styles.partnerTagsRow}>
                      <Badge>{partner.cefr ?? "—"}</Badge>
                      <Text style={styles.partnerSimText}>{simPct}% match</Text>
                    </View>
                  </View>
                </Card>
              );
            });
          })()}
        </View>

        {/* Trainer and course catalogs have no endpoint behind them. PRODUCT.md:97
            forbids fabricating the absent, so these sections stay out until
            real data can back them. */}

        {/* Premium promotion */}
        <Link asChild href="/(app)/subscription">
          <Pressable
            accessibilityLabel="View premium plans"
            accessibilityRole="button"
          >
            <LinearGradient
              colors={theme.gradients.pro}
              end={{ x: 1, y: 1 }}
              start={{ x: 0, y: 0 }}
              style={styles.promoBanner}
            >
              <Text style={styles.promoEyebrow}>LIMITED-TIME OFFER</Text>
              <Text style={styles.promoTitle}>
                Unlock unlimited calls with AceFluency Pro
              </Text>
            </LinearGradient>
          </Pressable>
        </Link>
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
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  greeting: {
    fontFamily: theme.fontFamily.bodyStrong,
    fontSize: theme.fontSize.sm,
    color: theme.colors.foreground,
    marginBottom: theme.spacing.xs / 2,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.card,
    alignItems: "center",
    justifyContent: "center",
    ...theme.shadow.card,
  },
  liveBanner: {
    gap: theme.spacing.xs,
  },
  liveBannerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  liveBannerTitle: {
    fontFamily: theme.fontFamily.title,
    fontSize: theme.fontSize.base,
    color: theme.colors.foreground,
  },
  liveBannerBody: {
    fontFamily: theme.fontFamily.body,
    fontSize: theme.fontSize.sm,
    color: theme.colors.mutedForeground,
  },
  ctaCard: {
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  ctaTextWrap: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  ctaEyebrow: {
    fontFamily: theme.fontFamily.label,
    fontSize: theme.fontSize.xs,
    color: "rgba(255,255,255,0.85)",
    letterSpacing: 1,
  },
  ctaTitle: {
    fontFamily: theme.fontFamily.display,
    fontSize: theme.fontSize["3xl"],
    color: "#FFFFFF",
  },
  ctaBody: {
    fontFamily: theme.fontFamily.body,
    fontSize: theme.fontSize.sm,
    color: "rgba(255,255,255,0.9)",
  },
  ctaIconWrap: {
    width: 56,
    height: 56,
    borderRadius: theme.borderRadius.full,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  progressCard: {
    gap: theme.spacing.sm,
  },
  progressHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  progressLabel: {
    fontFamily: theme.fontFamily.bodyStrong,
    fontSize: theme.fontSize.sm,
    color: theme.colors.foreground,
  },
  progressValue: {
    fontFamily: theme.fontFamily.label,
    fontSize: theme.fontSize.sm,
    color: theme.colors.mutedForeground,
  },
  progressHint: {
    fontFamily: theme.fontFamily.body,
    fontSize: theme.fontSize.xs,
    color: theme.colors.mutedForeground,
  },
  advancedCard: {
    gap: theme.spacing.xs,
  },
  advancedRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  advancedEligibility: {
    fontFamily: theme.fontFamily.caption,
    fontSize: theme.fontSize.xs,
    color: theme.colors.mutedForeground,
  },
  advancedTitle: {
    fontFamily: theme.fontFamily.title,
    fontSize: theme.fontSize.base,
    color: theme.colors.foreground,
  },
  advancedBody: {
    fontFamily: theme.fontFamily.body,
    fontSize: theme.fontSize.sm,
    color: theme.colors.mutedForeground,
    lineHeight: theme.fontSize.sm * 1.4,
  },
  advancedButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    marginTop: theme.spacing.xs,
  },
  advancedButtonText: {
    fontFamily: theme.fontFamily.bodyStrong,
    fontSize: theme.fontSize.sm,
    color: theme.colors.primary,
  },
  cardsList: {
    gap: theme.spacing.sm,
    marginTop: -theme.spacing.sm,
  },
  partnerCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
  },
  partnerMeta: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  partnerName: {
    fontFamily: theme.fontFamily.title,
    fontSize: theme.fontSize.base,
    color: theme.colors.foreground,
  },
  partnerTagsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  partnerSimText: {
    fontFamily: theme.fontFamily.caption,
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
    fontFamily: theme.fontFamily.body,
    fontSize: theme.fontSize.sm,
    color: theme.colors.mutedForeground,
  },
  hScrollContent: {
    gap: theme.spacing.md,
    marginTop: -theme.spacing.sm,
    paddingRight: theme.spacing.lg,
  },
  trainerCard: {
    width: 140,
    alignItems: "center",
    gap: theme.spacing.xs,
  },
  trainerName: {
    fontFamily: theme.fontFamily.title,
    fontSize: theme.fontSize.sm,
    color: theme.colors.foreground,
  },
  trainerRatingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  trainerRating: {
    fontFamily: theme.fontFamily.caption,
    fontSize: theme.fontSize.xs,
    color: theme.colors.mutedForeground,
  },
  courseCard: {
    width: 160,
    gap: theme.spacing.sm,
  },
  courseThumb: {
    height: 72,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  courseTitle: {
    fontFamily: theme.fontFamily.title,
    fontSize: theme.fontSize.sm,
    color: theme.colors.foreground,
  },
  courseMeta: {
    fontFamily: theme.fontFamily.caption,
    fontSize: theme.fontSize.xs,
    color: theme.colors.mutedForeground,
  },
  promoBanner: {
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    gap: theme.spacing.xs,
  },
  promoEyebrow: {
    fontFamily: theme.fontFamily.label,
    fontSize: theme.fontSize.xs,
    color: "#4A3306",
    letterSpacing: 1,
  },
  promoTitle: {
    fontFamily: theme.fontFamily.title,
    fontSize: theme.fontSize.lg,
    color: "#4A3306",
  },
}));
