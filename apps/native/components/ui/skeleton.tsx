import { useEffect } from "react";
import { AccessibilityInfo } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { StyleSheet } from "react-native-unistyles";

const PULSE_MS = 900;
const PULSE_MIN = 0.4;
const PULSE_MAX = 1;

export function Skeleton({
  width = "100%",
  height = 16,
  radius,
}: {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
}) {
  const opacity = useSharedValue(PULSE_MAX);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (reduced) {
        opacity.value = PULSE_MIN;
        return;
      }
      opacity.value = withRepeat(
        withTiming(PULSE_MIN, {
          duration: PULSE_MS,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true
      );
    });
    return () => cancelAnimation(opacity);
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        styles.base,
        { width, height, borderRadius: radius ?? height / 2 },
        animatedStyle,
      ]}
    />
  );
}

const styles = StyleSheet.create((theme) => ({
  base: {
    backgroundColor: theme.colors.muted,
  },
}));
