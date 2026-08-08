import { Pressable, Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

export function SectionHeader({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {actionLabel && onAction ? (
        <Pressable
          accessibilityLabel={actionLabel}
          accessibilityRole="button"
          hitSlop={8}
          onPress={onAction}
        >
          <Text style={styles.action}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing.md,
  },
  title: {
    fontFamily: theme.fontFamily.headline,
    fontSize: theme.fontSize.xl,
    color: theme.colors.foreground,
  },
  action: {
    fontFamily: theme.fontFamily.label,
    fontSize: theme.fontSize.sm,
    color: theme.colors.primary,
  },
}));
