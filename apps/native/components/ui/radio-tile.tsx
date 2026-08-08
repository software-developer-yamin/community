import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { Pressable, Text, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

type IoniconName = ComponentProps<typeof Ionicons>["name"];

/** Single-select tile for onboarding choices (goal, level, language). */
export function RadioTile({
  label,
  description,
  icon,
  selected,
  onPress,
}: {
  label: string;
  description?: string;
  icon?: IoniconName;
  selected: boolean;
  onPress: () => void;
}) {
  const { theme } = useUnistyles();

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={[styles.tile, selected && styles.tileSelected]}
    >
      {icon ? (
        <Ionicons
          color={selected ? theme.colors.primary : theme.colors.mutedForeground}
          name={icon}
          size={22}
        />
      ) : null}
      <View style={styles.textWrap}>
        <Text style={[styles.label, selected && styles.labelSelected]}>
          {label}
        </Text>
        {description ? (
          <Text style={styles.description}>{description}</Text>
        ) : null}
      </View>
      <View style={[styles.radio, selected && styles.radioSelected]}>
        {selected ? <View style={styles.radioDot} /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create((theme) => ({
  tile: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.card,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },
  tileSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.accent,
  },
  textWrap: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontFamily: theme.fontFamily.bodyStrong,
    fontSize: theme.fontSize.base,
    color: theme.colors.foreground,
  },
  labelSelected: {
    color: theme.colors.primary,
  },
  description: {
    fontFamily: theme.fontFamily.body,
    fontSize: theme.fontSize.xs,
    color: theme.colors.mutedForeground,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  radioSelected: {
    borderColor: theme.colors.primary,
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.primary,
  },
}));
