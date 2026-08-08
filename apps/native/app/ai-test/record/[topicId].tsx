/*
 * AceFluency / AI Speaking Test — Record & Results
 *
 * THESIS — One screen, four honest phases: idle → recording → analyzing →
 *   results. No route jump mid-flow, matching how the original app behaves.
 * OWN-WORLD — Golden Hour Studio: gradient waveform during recording, urgent
 *   coral state under the 20s mark, score bars in results.
 * STORY — Read the prompt → speak against a 60s timer → submit → see scores,
 *   transcript, and per-error corrections.
 * FIRST VIEWPORT — AI trainer prompt card + circular timer + record control.
 * FORM — Single scroll screen that morphs its primary control by phase.
 */

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";

type Phase = "idle" | "recording" | "analyzing" | "results";

const RECORD_SECONDS = 60;
const URGENT_THRESHOLD_S = 20;
const TICK_MS = 1000;
const ANALYSIS_DELAY_MS = 1800;

const TOPIC_PROMPTS: Record<string, { title: string; prompt: string }> = {
  "daily-routine": {
    title: "My Daily Routine",
    prompt: "Describe your typical day from morning to evening.",
  },
  hometown: {
    title: "My Hometown",
    prompt: "Talk about your hometown, its culture, and attractions.",
  },
  "favorite-food": {
    title: "My Favorite Food",
    prompt: "Describe a dish you love and why it means something to you.",
  },
  "dream-job": {
    title: "My Dream Job",
    prompt: "Talk about the job you'd love to have and why.",
  },
  travel: {
    title: "A Place I'd Like to Visit",
    prompt: "Describe a place you want to visit and what draws you there.",
  },
  interview: {
    title: "Introduce Yourself",
    prompt: "Give a 60-second introduction as if meeting a new colleague.",
  },
};

// Illustrative scoring shape — the analysis model isn't wired yet
// (ARCHITECTURE.md §2.8); this demonstrates the results UI at full fidelity.
const MOCK_RESULT = {
  transcript:
    "So, uh, my daily routine start from six in morning, I wake up and doing exercise then go for office...",
  scores: { grammar: 60, vocabulary: 50, fluency: 68, pronunciation: 72 },
  errors: [
    {
      label: "Sentence structure",
      incorrect: "my daily routine start from six",
      corrected: "My daily routine starts at six",
    },
    {
      label: "Preposition",
      incorrect: "go for office",
      corrected: "go to the office",
    },
  ],
};

export default function AiTestRecord() {
  const { theme } = useUnistyles();
  const params = useLocalSearchParams<{ topicId: string }>();
  const topic =
    TOPIC_PROMPTS[params.topicId ?? ""] ?? TOPIC_PROMPTS["daily-routine"];

  const [phase, setPhase] = useState<Phase>("idle");
  const [secondsLeft, setSecondsLeft] = useState(RECORD_SECONDS);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(
    undefined
  );

  useEffect(() => {
    if (phase !== "recording") {
      return;
    }
    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, TICK_MS);
    return () => clearInterval(timerRef.current);
  }, [phase]);

  useEffect(() => {
    if (phase === "analyzing") {
      const id = setTimeout(() => setPhase("results"), ANALYSIS_DELAY_MS);
      return () => clearTimeout(id);
    }
  }, [phase]);

  const urgent = phase === "recording" && secondsLeft <= URGENT_THRESHOLD_S;
  const timedOut = phase === "recording" && secondsLeft === 0;

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Badge>{`Topic · ${topic.title}`}</Badge>
        <Text style={styles.prompt}>{topic.prompt}</Text>

        {phase !== "results" && (
          <Card style={styles.recordCard}>
            <View
              style={[
                styles.timerRing,
                urgent && styles.timerRingUrgent,
                phase === "analyzing" && styles.timerRingAnalyzing,
              ]}
            >
              <Text style={styles.timerValue}>
                {phase === "analyzing" ? "…" : secondsLeft}
              </Text>
              <Text style={styles.timerLabel}>
                {phase === "analyzing" ? "Analyzing" : "seconds"}
              </Text>
            </View>

            {phase === "recording" && (
              <LinearGradient
                colors={theme.gradients.practice}
                end={{ x: 1, y: 0 }}
                start={{ x: 0, y: 0 }}
                style={styles.waveform}
              />
            )}

            {phase === "idle" && (
              <Button
                icon={<Ionicons color="#FFFFFF" name="mic" size={18} />}
                onPress={() => setPhase("recording")}
              >
                Start speaking
              </Button>
            )}
            {phase === "recording" && !timedOut && (
              <Button
                onPress={() => setPhase("analyzing")}
                style={urgent ? styles.urgentButton : undefined}
                variant={urgent ? "destructive" : "secondary"}
              >
                {urgent
                  ? `Stop speaking – ${secondsLeft}s left!`
                  : "Stop recording"}
              </Button>
            )}
            {timedOut && (
              <Button onPress={() => setPhase("analyzing")}>
                Submit for AI analysis
              </Button>
            )}
            {phase === "analyzing" && (
              <Button disabled loading onPress={() => undefined}>
                Analyzing…
              </Button>
            )}
          </Card>
        )}

        {phase === "results" && (
          <>
            <Card style={styles.transcriptCard}>
              <Text style={styles.cardTitle}>Your speech</Text>
              <Text style={styles.transcriptText}>
                {MOCK_RESULT.transcript}
              </Text>
            </Card>

            <Card style={styles.scoresCard}>
              <Text style={styles.cardTitle}>Performance scores</Text>
              {Object.entries(MOCK_RESULT.scores).map(([key, value]) => (
                <View key={key} style={styles.scoreRow}>
                  <Text style={styles.scoreLabel}>
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                  </Text>
                  <View style={styles.scoreBarWrap}>
                    <ProgressBar progress={value / 100} />
                  </View>
                  <Text style={styles.scoreValue}>{value}/100</Text>
                </View>
              ))}
            </Card>

            <Card style={styles.errorsCard}>
              <Text style={styles.cardTitle}>
                Errors found ({MOCK_RESULT.errors.length})
              </Text>
              {MOCK_RESULT.errors.map((error, index) => (
                <View key={error.label} style={styles.errorRow}>
                  <Text style={styles.errorLabel}>
                    {index + 1}. {error.label}
                  </Text>
                  <Text style={styles.errorIncorrect}>✗ {error.incorrect}</Text>
                  <Text style={styles.errorCorrected}>✓ {error.corrected}</Text>
                </View>
              ))}
            </Card>
          </>
        )}
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
    paddingTop: rt.insets.top + theme.spacing.lg,
    paddingBottom: rt.insets.bottom + theme.spacing.xl,
    gap: theme.spacing.lg,
  },
  prompt: {
    fontFamily: theme.fontFamily.headline,
    fontSize: theme.fontSize.xl,
    color: theme.colors.foreground,
  },
  recordCard: {
    alignItems: "center",
    gap: theme.spacing.lg,
    paddingVertical: theme.spacing.xl,
  },
  timerRing: {
    width: 140,
    height: 140,
    borderRadius: theme.borderRadius.full,
    borderWidth: 6,
    borderColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  timerRingUrgent: {
    borderColor: theme.colors.secondary,
  },
  timerRingAnalyzing: {
    borderColor: theme.colors.border,
  },
  timerValue: {
    fontFamily: theme.fontFamily.display,
    fontSize: theme.fontSize["3xl"],
    color: theme.colors.foreground,
  },
  timerLabel: {
    fontFamily: theme.fontFamily.caption,
    fontSize: theme.fontSize.xs,
    color: theme.colors.mutedForeground,
  },
  waveform: {
    width: "100%",
    height: 40,
    borderRadius: theme.borderRadius.full,
    opacity: 0.6,
  },
  urgentButton: {},
  cardTitle: {
    fontFamily: theme.fontFamily.title,
    fontSize: theme.fontSize.base,
    color: theme.colors.foreground,
    marginBottom: theme.spacing.sm,
  },
  transcriptCard: {},
  transcriptText: {
    fontFamily: theme.fontFamily.body,
    fontSize: theme.fontSize.sm,
    color: theme.colors.mutedForeground,
    lineHeight: theme.fontSize.sm * 1.5,
    fontStyle: "italic",
  },
  scoresCard: {
    gap: theme.spacing.sm,
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  scoreLabel: {
    width: 88,
    fontFamily: theme.fontFamily.bodyStrong,
    fontSize: theme.fontSize.sm,
    color: theme.colors.foreground,
  },
  scoreBarWrap: {
    flex: 1,
  },
  scoreValue: {
    width: 48,
    fontFamily: theme.fontFamily.caption,
    fontSize: theme.fontSize.xs,
    color: theme.colors.mutedForeground,
    textAlign: "right",
  },
  errorsCard: {
    gap: theme.spacing.md,
  },
  errorRow: {
    gap: theme.spacing.xs / 2,
  },
  errorLabel: {
    fontFamily: theme.fontFamily.bodyStrong,
    fontSize: theme.fontSize.sm,
    color: theme.colors.foreground,
  },
  errorIncorrect: {
    fontFamily: theme.fontFamily.body,
    fontSize: theme.fontSize.sm,
    color: theme.colors.destructive,
  },
  errorCorrected: {
    fontFamily: theme.fontFamily.body,
    fontSize: theme.fontSize.sm,
    color: theme.colors.success,
  },
}));
