import { Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { Button } from "@/components/ui/button";

export function EmptyState({
  emoji,
  title,
  body,
  actionLabel,
  onAction,
}: {
  emoji: string;
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      {actionLabel && onAction ? (
        <Button
          fullWidth={false}
          onPress={onAction}
          size="md"
          style={styles.actionButton}
          variant="secondary"
        >
          {actionLabel}
        </Button>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing.xl,
    gap: theme.spacing.sm,
  },
  emoji: {
    fontSize: 40,
    marginBottom: theme.spacing.xs,
  },
  title: {
    fontFamily: theme.fontFamily.title,
    fontSize: theme.fontSize.lg,
    color: theme.colors.foreground,
    textAlign: "center",
  },
  body: {
    fontFamily: theme.fontFamily.body,
    fontSize: theme.fontSize.sm,
    color: theme.colors.mutedForeground,
    textAlign: "center",
    lineHeight: theme.fontSize.sm * 1.5,
  },
  actionButton: {
    marginTop: theme.spacing.sm,
  },
}));
