import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import type { ComponentProps } from "react";
import { useRef, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { Button } from "@/components/ui/button";
import { LearnScreenShell } from "@/components/ui/screen-shell";

type IoniconName = ComponentProps<typeof Ionicons>["name"];

interface Slide {
  eyebrow: string;
  icon: IoniconName;
  points: string[];
  title: string;
}

const SLIDES: Slide[] = [
  {
    eyebrow: "LIVE, NOT LECTURES",
    icon: "mic",
    title: "Real people, real conversations",
    points: [
      "Get matched with a co-learner at your level in seconds — no scheduling, no waiting for a slot.",
      "Every call is voice, face to face. You talk far more English per week than any app course asks of you.",
    ],
  },
  {
    eyebrow: "COACHES ON DEMAND",
    icon: "school",
    title: "Certified trainers when you want one",
    points: [
      "Book 1-on-1 sessions with certified trainers, or drop into small group classes on a fixed schedule.",
      "Browse trainer profiles with ratings, session counts, and languages before you spend a minute.",
    ],
  },
  {
    eyebrow: "AI SPEAKING TEST",
    icon: "sparkles",
    title: "Get scored the moment you finish speaking",
    points: [
      "Pick a topic, talk for 60 seconds, and get a transcript with scores on fluency, grammar, vocabulary, and pronunciation.",
      "Re-take the same topic next month and watch the numbers move.",
    ],
  },
];

const DOT_COUNT = SLIDES.length;
const PAGE_WIDTH_RATIO = 1;
const DOT_SIZE = 8;
const DOT_GAP = 8;

export default function Welcome() {
  const router = useRouter();
  const { theme } = useUnistyles();
  const [index, setIndex] = useState(0);
  const [pageWidth, setPageWidth] = useState(0);
  const lastIndex = useRef(0);

  function handleScrollEnd(event: {
    nativeEvent: {
      contentOffset: { x: number };
      layoutMeasurement: { width: number };
    };
  }) {
    const { x } = event.nativeEvent.contentOffset;
    const width = event.nativeEvent.layoutMeasurement.width;
    if (width <= 0) {
      return;
    }
    const nextIndex = Math.min(
      Math.max(Math.round(x / width), 0),
      DOT_COUNT - 1
    );
    if (nextIndex !== lastIndex.current) {
      lastIndex.current = nextIndex;
      setIndex(nextIndex);
    }
  }

  function goNext() {
    const nextIndex = index + 1;
    if (nextIndex >= DOT_COUNT) {
      router.push("/(auth)/onboarding/features");
      return;
    }
    setIndex(nextIndex);
    lastIndex.current = nextIndex;
  }

  function goBack() {
    const previousIndex = index - 1;
    if (previousIndex < 0) {
      return;
    }
    setIndex(previousIndex);
    lastIndex.current = previousIndex;
  }

  const slide = SLIDES[index];

  return (
    <LearnScreenShell>
      <View
        onLayout={(event) => {
          setPageWidth(event.nativeEvent.layout.width);
        }}
        style={styles.carousel}
      >
        <ScrollView
          accessibilityRole="adjustable"
          contentContainerStyle={styles.carouselContent}
          decelerationRate="fast"
          horizontal
          onMomentumScrollEnd={handleScrollEnd}
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          snapToInterval={pageWidth * PAGE_WIDTH_RATIO}
        >
          {SLIDES.map((item) => (
            <View
              accessibilityLabel={`${item.title}. ${item.points.join(" ")}`}
              key={item.title}
              style={[
                styles.slide,
                { width: pageWidth * PAGE_WIDTH_RATIO || undefined },
              ]}
            >
              <View style={styles.iconWrap}>
                <Ionicons
                  color={theme.colors.primary}
                  name={item.icon}
                  size={40}
                />
              </View>
              <Text style={styles.eyebrow}>{item.eyebrow}</Text>
              <Text style={styles.title}>{item.title}</Text>
              {item.points.map((point) => (
                <View key={point} style={styles.pointRow}>
                  <Ionicons
                    color={theme.colors.secondary}
                    name="sparkles"
                    size={16}
                  />
                  <Text style={styles.pointText}>{point}</Text>
                </View>
              ))}
              <View style={styles.counterGap} />
            </View>
          ))}
        </ScrollView>

        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={styles.dots}
        >
          {SLIDES.map((item, dotIndex) => (
            <View
              key={item.title}
              style={[styles.dot, dotIndex === index && styles.dotActive]}
            />
          ))}
        </View>
      </View>

      <View style={styles.footer}>
        <Button
          accessibilityHint="Moves to the next slide, then into the feature tour."
          onPress={goNext}
        >
          {index === DOT_COUNT - 1 ? "Show me around" : "Next"}
        </Button>
        {index > 0 ? (
          <Button
            accessibilityHint="Returns to the previous slide."
            onPress={goBack}
            variant="ghost"
          >
            Back
          </Button>
        ) : null}
        <Text style={styles.skipHint}>
          {slide.eyebrow} · {index + 1} of {DOT_COUNT}
        </Text>
      </View>
    </LearnScreenShell>
  );
}

const styles = StyleSheet.create((theme) => ({
  carousel: {
    flex: 1,
    gap: theme.spacing.lg,
  },
  carouselContent: {
    gap: theme.spacing.lg,
  },
  slide: {
    gap: theme.spacing.sm,
    paddingRight: theme.spacing.md,
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.colors.accent,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing.sm,
  },
  eyebrow: {
    fontFamily: theme.fontFamily.label,
    fontSize: theme.fontSize.xs,
    color: theme.colors.primary,
    letterSpacing: 1,
  },
  title: {
    fontFamily: theme.fontFamily.display,
    fontSize: theme.fontSize["3xl"],
    color: theme.colors.foreground,
    lineHeight: theme.fontSize["3xl"] * 1.15,
  },
  pointRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  pointText: {
    flex: 1,
    fontFamily: theme.fontFamily.body,
    fontSize: theme.fontSize.base,
    color: theme.colors.foreground,
    lineHeight: theme.fontSize.base * 1.5,
  },
  counterGap: {
    height: theme.spacing.lg,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: DOT_GAP,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: theme.colors.border,
  },
  dotActive: {
    backgroundColor: theme.colors.primary,
    width: DOT_SIZE * 3,
  },
  footer: {
    gap: theme.spacing.sm,
  },
  skipHint: {
    fontFamily: theme.fontFamily.caption,
    fontSize: theme.fontSize.xs,
    color: theme.colors.mutedForeground,
    textAlign: "center",
  },
}));
