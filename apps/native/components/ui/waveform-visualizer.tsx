import { LinearGradient } from "expo-linear-gradient";
import { useEffect } from "react";
import { AccessibilityInfo, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

const BAR_COUNT = 24;
const BAR_HEIGHTS = Array.from({ length: BAR_COUNT }, (_, i) => {
  const wave = Math.sin(i * 0.9) * 0.35 + 0.55;
  return Math.max(0.15, Math.min(1, wave));
});

function Bar({
  index,
  active,
  gradient,
}: {
  index: number;
  active: boolean;
  gradient: readonly [string, string];
}) {
  const scale = useSharedValue(BAR_HEIGHTS[index]);

  useEffect(() => {
    if (!active) {
      cancelAnimation(scale);
      scale.value = withTiming(BAR_HEIGHTS[index] * 0.4, { duration: 200 });
      return;
    }
    AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (reduced) {
        scale.value = BAR_HEIGHTS[index];
        return;
      }
      scale.value = withDelay(
        index * 30,
        withRepeat(
          withTiming(BAR_HEIGHTS[(index + 3) % BAR_COUNT], {
            duration: 420,
            easing: Easing.inOut(Easing.ease),
          }),
          -1,
          true
        )
      );
    });
    return () => cancelAnimation(scale);
  }, [active, index, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: scale.value }],
  }));

  return (
    <Animated.View style={[styles.barTrack, animatedStyle]}>
      <LinearGradient
        colors={gradient}
        end={{ x: 0, y: 0 }}
        start={{ x: 0, y: 1 }}
        style={styles.barFill}
      />
    </Animated.View>
  );
}

/** Real-time-styled waveform for recording/speaking states. Simulated bars, not a live mic FFT. */
export function WaveformVisualizer({ active = true }: { active?: boolean }) {
  const { theme } = useUnistyles();
  const gradient = [theme.colors.primary, theme.colors.sky] as const;

  return (
    <View style={styles.row}>
      {BAR_HEIGHTS.map((_, i) => (
        <Bar
          active={active}
          gradient={gradient}
          index={i}
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length bar row never reorders
          key={i}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    height: 48,
  },
  barTrack: {
    width: 3,
    height: 48,
    borderRadius: theme.borderRadius.full,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  barFill: {
    flex: 1,
    borderRadius: theme.borderRadius.full,
  },
}));
