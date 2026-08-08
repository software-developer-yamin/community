import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps, ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

type IoniconName = ComponentProps<typeof Ionicons>["name"];

/** Settings/list-detail row: icon, title, optional subtitle, trailing chevron or custom trailing content. */
export function ListRow({
  icon,
  title,
  subtitle,
  onPress,
  trailing,
  destructive = false,
}: {
  icon?: IoniconName;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  trailing?: ReactNode;
  destructive?: boolean;
}) {
  const { theme } = useUnistyles();

  return (
    <Pressable
      accessibilityLabel={title}
      accessibilityRole={onPress ? "button" : undefined}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {icon ? (
        <View
          style={[styles.iconWrap, destructive && styles.iconWrapDestructive]}
        >
          <Ionicons
            color={
              destructive ? theme.colors.destructive : theme.colors.primary
            }
            name={icon}
            size={18}
          />
        </View>
      ) : null}
      <View style={styles.textWrap}>
        <Text style={[styles.title, destructive && styles.titleDestructive]}>
          {title}
        </Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {trailing ??
        (onPress ? (
          <Ionicons
            color={theme.colors.mutedForeground}
            name="chevron-forward"
            size={18}
          />
        ) : null)}
    </Pressable>
  );
}

const styles = StyleSheet.create((theme) => ({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.sm + 2,
  },
  pressed: {
    opacity: 0.7,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapDestructive: {
    backgroundColor: theme.colors.destructiveSurface,
  },
  textWrap: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontFamily: theme.fontFamily.bodyStrong,
    fontSize: theme.fontSize.base,
    color: theme.colors.foreground,
  },
  titleDestructive: {
    color: theme.colors.destructive,
  },
  subtitle: {
    fontFamily: theme.fontFamily.body,
    fontSize: theme.fontSize.xs,
    color: theme.colors.mutedForeground,
  },
}));
