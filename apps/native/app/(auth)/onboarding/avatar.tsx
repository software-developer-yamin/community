import { useRouter } from "expo-router";
import { Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import {
  OnboardingHeader,
  useOnboardingProgress,
} from "@/components/onboarding-progress";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { FormScreenShell } from "@/components/ui/screen-shell";

const PRESETS = ["🦊", "🐼", "🦉", "🐧", "🦁", "🐨", "🐢", "🦜"] as const;

const STEP = 6;
const TOTAL_STEPS = 7;

export default function Avatar() {
  const router = useRouter();
  const { avatarUri, displayName, setAvatarUri } = useOnboardingProgress();
  const previewName = displayName.trim() || "You";

  return (
    <FormScreenShell>
      <OnboardingHeader
        step={STEP}
        subtitle="Pick a face for now. Real trainers and co-learners recognise your name faster when your face shows up in a room."
        title="Choose an avatar"
        totalSteps={TOTAL_STEPS}
      />

      <View style={styles.previewRow}>
        <View style={styles.previewRing}>
          <View style={styles.previewGlyph}>
            <Text style={styles.previewEmoji}>{avatarUri ?? "🙂"}</Text>
          </View>
        </View>
        <View style={styles.previewText}>
          <Text numberOfLines={1} style={styles.previewName}>
            {previewName}
          </Text>
          <Text style={styles.previewHint}>
            {avatarUri ? "Avatar picked" : "Showing your initials for now"}
          </Text>
        </View>
      </View>

      <View accessibilityRole="radiogroup" style={styles.presets}>
        {PRESETS.map((preset) => (
          <View key={preset} style={styles.presetItem}>
            <Chip
              label={preset}
              onPress={() => {
                setAvatarUri(avatarUri === preset ? null : preset);
              }}
              selected={avatarUri === preset}
            />
          </View>
        ))}
      </View>

      <Text style={styles.note}>
        Photo upload arrives with trainer profiles — for now an avatar keeps you
        recognisable in live rooms.
      </Text>

      <Button
        accessibilityHint="Moves on to the final permissions step."
        onPress={() => {
          router.push("/(auth)/onboarding/permissions");
        }}
      >
        Continue
      </Button>

      <Button
        accessibilityHint="Clears your avatar choice and uses your initials."
        disabled={!avatarUri}
        onPress={() => {
          setAvatarUri(null);
        }}
        variant="ghost"
      >
        Use my initials
      </Button>
    </FormScreenShell>
  );
}

const styles = StyleSheet.create((theme) => ({
  previewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
  },
  previewRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  previewGlyph: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  previewEmoji: {
    fontSize: theme.fontSize["2xl"],
  },
  previewText: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  previewName: {
    fontFamily: theme.fontFamily.title,
    fontSize: theme.fontSize.lg,
    color: theme.colors.foreground,
  },
  previewHint: {
    fontFamily: theme.fontFamily.caption,
    fontSize: theme.fontSize.xs,
    color: theme.colors.mutedForeground,
  },
  presets: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
  },
  presetItem: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  note: {
    fontFamily: theme.fontFamily.caption,
    fontSize: theme.fontSize.xs,
    color: theme.colors.mutedForeground,
    lineHeight: theme.fontSize.xs * 1.5,
  },
}));
