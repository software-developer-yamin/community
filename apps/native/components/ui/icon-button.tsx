import type { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { Pressable } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

type IoniconName = ComponentProps<typeof Ionicons>["name"];

export function IconButton({
  icon: Icon,
  name,
  accessibilityLabel,
  onPress,
  size = 22,
  variant = "surface",
}: {
  icon: typeof Ionicons;
  name: IoniconName;
  accessibilityLabel: string;
  onPress?: () => void;
  size?: number;
  variant?: "surface" | "transparent";
}) {
  const { theme } = useUnistyles();

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        variant === "surface" && [styles.surface, theme.shadow.card],
        pressed && styles.pressed,
      ]}
    >
      <Icon color={theme.colors.foreground} name={name} size={size} />
    </Pressable>
  );
}

const styles = StyleSheet.create((theme) => ({
  base: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  surface: {
    backgroundColor: theme.colors.card,
  },
  pressed: {
    opacity: 0.85,
  },
}));
