import { useQuery } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Pressable, Text, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { orpc } from "@/utils/orpc";

type MatchStatus =
  | "searching"
  | "stale"
  | "long_wait"
  | "found"
  | "no_embedding";

interface Partner {
  cefr: string | null;
  id: string;
  image: string | null;
  name: string;
  sim: number;
}

function formatTime(seconds: number): string {
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export default function MatchingScreen() {
  const router = useRouter();
  const { theme } = useUnistyles();
  const [elapsed, setElapsed] = useState(0);
  const [status, setStatus] = useState<MatchStatus>("searching");
  const [foundPartner, setFoundPartner] = useState<Partner | null>(null);
  const [filterHint, setFilterHint] = useState(false);
  const dot1Anim = useRef(new Animated.Value(0)).current;
  const dot2Anim = useRef(new Animated.Value(0)).current;
  const dot3Anim = useRef(new Animated.Value(0)).current;

  // Animated dots loop
  useEffect(() => {
    if (
      status !== "searching" &&
      status !== "stale" &&
      status !== "long_wait"
    ) {
      return;
    }

    const animate = (anim: Animated.Value, delay: number) => {
      const sequence = Animated.sequence([
        Animated.delay(delay),
        Animated.loop(
          Animated.sequence([
            Animated.timing(anim, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 0,
              duration: 400,
              useNativeDriver: true,
            }),
          ])
        ),
      ]);
      sequence.start();
      return sequence;
    };

    const anim1 = animate(dot1Anim, 0);
    const anim2 = animate(dot2Anim, 150);
    const anim3 = animate(dot3Anim, 300);

    return () => {
      anim1.stop();
      anim2.stop();
      anim3.stop();
    };
  }, [status, dot1Anim, dot2Anim, dot3Anim]);

  // Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed((prev) => {
        const next = prev + 1;
        if (next >= 300) {
          setStatus("long_wait");
        } else if (next >= 60) {
          setStatus("stale");
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Poll matchPartners
  const matchQuery = useQuery({
    ...orpc.models.matchPartners.queryOptions({ input: { limit: 1 } }),
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (!matchQuery.data) {
      return;
    }

    if (matchQuery.data.reason === "no_embedding") {
      setStatus("no_embedding");
      return;
    }

    if (matchQuery.data.partners.length > 0) {
      setStatus("found");
      setFoundPartner(matchQuery.data.partners[0] ?? null);
      return;
    }

    // Check filter hint at 60s+ mark
    const stats = matchQuery.data.queueStats;
    if (elapsed >= 60 && stats && stats.genderFiltered > 0) {
      setFilterHint(true);
    }
  }, [matchQuery.data, elapsed]);

  const handleExit = useCallback(() => {
    router.back();
  }, [router]);

  const handleAdjustFilters = useCallback(() => {
    router.back();
  }, [router]);

  const statusMessage = (() => {
    if (status === "searching" && elapsed > 15) {
      return `Still looking... (${formatTime(elapsed)})`;
    }
    switch (status) {
      case "searching": {
        return "Looking for a partner...";
      }
      case "stale": {
        return "No partners online right now — we'll keep trying";
      }
      case "long_wait": {
        return "We've been looking for 5 minutes";
      }
      case "found": {
        return "Partner found!";
      }
      default: {
        return "";
      }
    }
  })();

  const dotOpacity = (anim: Animated.Value) =>
    anim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 1],
    });

  const renderStatusContent = () => {
    if (status === "found" && foundPartner) {
      return (
        <View style={styles.foundContainer}>
          <View
            style={[
              styles.avatarCircle,
              { backgroundColor: `${theme.colors.primary}20` },
            ]}
          >
            <Text style={[styles.avatarText, { color: theme.colors.primary }]}>
              {foundPartner.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text
            style={[styles.partnerName, { color: theme.colors.typography }]}
          >
            {foundPartner.name}
          </Text>
          {foundPartner.cefr && (
            <Text
              style={[
                styles.cefrBadge,
                { color: theme.colors.mutedForeground },
              ]}
            >
              {foundPartner.cefr}
            </Text>
          )}
          <Text
            style={[
              styles.connectingText,
              { color: theme.colors.mutedForeground },
            ]}
          >
            Connecting you to the call room...
          </Text>
        </View>
      );
    }

    if (status === "no_embedding") {
      return (
        <View style={styles.centerContent}>
          <Text
            style={[
              styles.noEmbedText,
              { color: theme.colors.mutedForeground },
            ]}
          >
            Set up your profile first to find practice partners.
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.centerContent}>
        {/* Animated dots indicator */}
        <View style={styles.dotsRow}>
          <Animated.View
            style={[
              styles.dot,
              {
                backgroundColor: theme.colors.primary,
                opacity: dotOpacity(dot1Anim),
              },
            ]}
          />
          <Animated.View
            style={[
              styles.dot,
              {
                backgroundColor: theme.colors.primary,
                opacity: dotOpacity(dot2Anim),
              },
            ]}
          />
          <Animated.View
            style={[
              styles.dot,
              {
                backgroundColor: theme.colors.primary,
                opacity: dotOpacity(dot3Anim),
              },
            ]}
          />
        </View>

        <Text style={[styles.statusText, { color: theme.colors.typography }]}>
          {statusMessage}
        </Text>

        {/* Filter hint */}
        {filterHint && (
          <View
            style={[styles.filterHintBox, { borderColor: theme.colors.border }]}
          >
            <Text
              style={[
                styles.filterHintText,
                { color: theme.colors.mutedForeground },
              ]}
            >
              Your gender preference is filtering some potential matches. You
              may find more partners with broader filters.
            </Text>
          </View>
        )}

        {/* Timer */}
        <Text
          style={[styles.timerText, { color: theme.colors.mutedForeground }]}
        >
          {formatTime(elapsed)}
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen options={{ title: "Finding Your Partner" }} />

      <View style={styles.content}>
        {renderStatusContent()}

        {/* Action buttons */}
        <View style={styles.actions}>
          {status === "long_wait" && (
            <Pressable
              onPress={handleAdjustFilters}
              style={[
                styles.actionButton,
                {
                  borderColor: theme.colors.border,
                  borderWidth: 1,
                },
              ]}
            >
              <Text
                style={[styles.actionText, { color: theme.colors.typography }]}
              >
                Lower Filter Strictness
              </Text>
            </Pressable>
          )}
          {status === "stale" && (
            <Pressable
              onPress={handleAdjustFilters}
              style={[
                styles.actionButton,
                {
                  borderColor: theme.colors.border,
                  borderWidth: 1,
                },
              ]}
            >
              <Text
                style={[styles.actionText, { color: theme.colors.typography }]}
              >
                Adjust Filters
              </Text>
            </Pressable>
          )}
          <Pressable
            onPress={handleExit}
            style={[
              styles.actionButton,
              status === "found"
                ? { backgroundColor: theme.colors.primary }
                : {
                    borderColor: theme.colors.border,
                    borderWidth: 1,
                  },
            ]}
          >
            <Text
              style={[
                styles.actionText,
                status === "found"
                  ? { color: "#fff" }
                  : { color: theme.colors.typography },
              ]}
            >
              {status === "found" ? "Go to Call" : "Exit"}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  root: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    gap: 32,
  },
  centerContent: {
    alignItems: "center",
    gap: 16,
  },
  dotsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  statusText: {
    fontSize: theme.fontSize.lg,
    textAlign: "center",
    lineHeight: 28,
  },
  timerText: {
    fontFamily: "monospace",
    fontSize: theme.fontSize.base,
    marginTop: 8,
  },
  filterHintBox: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  filterHintText: {
    fontSize: theme.fontSize.sm,
    textAlign: "center",
    lineHeight: 20,
  },
  noEmbedText: {
    fontSize: theme.fontSize.base,
    textAlign: "center",
  },
  foundContainer: {
    alignItems: "center",
    gap: 12,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 32,
    fontWeight: "700",
  },
  partnerName: {
    fontSize: theme.fontSize.xl,
    fontWeight: "600",
  },
  cefrBadge: {
    fontSize: theme.fontSize.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    overflow: "hidden",
  },
  connectingText: {
    fontSize: theme.fontSize.sm,
    marginTop: 4,
  },
  actions: {
    width: "100%",
    gap: 12,
  },
  actionButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
  },
  actionText: {
    fontSize: theme.fontSize.base,
    fontWeight: "600",
  },
}));
