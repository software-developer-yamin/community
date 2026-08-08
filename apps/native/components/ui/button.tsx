import { LinearGradient } from "expo-linear-gradient";
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";
type ButtonSize = "md" | "lg";

const PRESS_SCALE = 0.96;
const SPRING_CONFIG = { damping: 14, stiffness: 260 };

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function getTextStyle({
  variant,
  size,
  isDisabled,
  styles,
}: {
  variant: ButtonVariant;
  size: ButtonSize;
  isDisabled: boolean;
  styles: {
    label: TextStyle;
    labelMd: TextStyle;
    labelSecondary: TextStyle;
    labelGhost: TextStyle;
    labelDestructive: TextStyle;
    labelDisabled: TextStyle;
  };
}): TextStyle[] {
  const textStyles: TextStyle[] = [styles.label];
  if (size === "md") {
    textStyles.push(styles.labelMd);
  }
  if (variant === "secondary") {
    textStyles.push(styles.labelSecondary);
  }
  if (variant === "ghost") {
    textStyles.push(styles.labelGhost);
  }
  if (variant === "destructive") {
    textStyles.push(styles.labelDestructive);
  }
  if (isDisabled) {
    textStyles.push(styles.labelDisabled);
  }
  return textStyles;
}

function ButtonContent({
  loading,
  icon,
  textStyle,
  loadingColor,
  children,
}: {
  loading?: boolean;
  icon?: ReactNode;
  textStyle: TextStyle[];
  loadingColor: string;
  children: string;
}) {
  if (loading) {
    return <ActivityIndicator color={loadingColor} />;
  }
  return (
    <>
      {icon}
      <Text style={textStyle}>{children}</Text>
    </>
  );
}

export function Button({
  children,
  onPress,
  variant = "primary",
  size = "lg",
  disabled,
  loading,
  icon,
  fullWidth = true,
  accessibilityLabel,
  accessibilityHint,
  style,
}: {
  children: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  fullWidth?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: ViewStyle;
}) {
  const { theme } = useUnistyles();
  const scale = useSharedValue(1);
  const isDisabled = Boolean(disabled || loading);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(PRESS_SCALE, SPRING_CONFIG);
  };
  const handlePressOut = () => {
    scale.value = withSpring(1, SPRING_CONFIG);
  };

  const textStyle = getTextStyle({ variant, size, isDisabled, styles });
  const loadingColor =
    variant === "secondary" || variant === "ghost"
      ? theme.colors.primary
      : "#FFFFFF";
  const content = (
    <ButtonContent
      icon={icon}
      loading={loading}
      loadingColor={loadingColor}
      textStyle={textStyle}
    >
      {children}
    </ButtonContent>
  );

  if (variant === "primary" && !isDisabled) {
    return (
      <AnimatedPressable
        accessibilityHint={accessibilityHint}
        accessibilityLabel={accessibilityLabel ?? children}
        accessibilityRole="button"
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          animatedStyle,
          fullWidth && styles.fullWidth,
          theme.shadow.cta,
          style,
        ]}
      >
        <LinearGradient
          colors={theme.gradients.practice}
          end={{ x: 1, y: 1 }}
          start={{ x: 0, y: 0 }}
          style={[
            styles.base,
            size === "md" ? styles.sizeMd : styles.sizeLg,
            styles.row,
          ]}
        >
          {content}
        </LinearGradient>
      </AnimatedPressable>
    );
  }

  return (
    <AnimatedPressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={accessibilityLabel ?? children}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      disabled={isDisabled}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        animatedStyle,
        styles.base,
        styles.row,
        size === "md" ? styles.sizeMd : styles.sizeLg,
        fullWidth && styles.fullWidth,
        variant === "secondary" && styles.secondary,
        variant === "ghost" && styles.ghost,
        variant === "destructive" && styles.destructive,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {content}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create((theme) => ({
  base: {
    borderRadius: theme.borderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  row: {
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  sizeLg: {
    height: 56,
    paddingHorizontal: theme.spacing.lg,
  },
  sizeMd: {
    height: 44,
    paddingHorizontal: theme.spacing.md,
  },
  fullWidth: {
    width: "100%",
  },
  secondary: {
    backgroundColor: theme.colors.card,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },
  ghost: {
    backgroundColor: "transparent",
  },
  destructive: {
    backgroundColor: theme.colors.destructiveSurface,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    fontFamily: theme.fontFamily.bodyStrong,
    fontSize: theme.fontSize.base,
    color: "#FFFFFF",
  },
  labelMd: {
    fontSize: theme.fontSize.sm,
  },
  labelSecondary: {
    color: theme.colors.foreground,
  },
  labelGhost: {
    color: theme.colors.primary,
  },
  labelDestructive: {
    color: theme.colors.destructive,
  },
  labelDisabled: {
    opacity: 0.7,
  },
}));
