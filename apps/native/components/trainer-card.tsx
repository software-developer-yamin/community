/*
 * AceFluency / TrainerCard
 *
 * Shared trainer-marketplace molecule (Cambly/italki-register trust card):
 * photo/avatar, name, star rating + session count, specialty tags, and a
 * standardized Verified badge (ARCHITECTURE.md §5 finding #7 — the old app
 * only showed a Verified badge on some trainer cards; this component makes
 * it consistent everywhere trainers appear).
 */

import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StarRating } from "@/components/ui/star-rating";
import type { Trainer } from "@/lib/illustrative-trainers";

export function TrainerCard({
  trainer,
  onPress,
  onBook,
}: {
  trainer: Trainer;
  onPress?: () => void;
  onBook?: () => void;
}) {
  const { theme } = useUnistyles();

  return (
    <Card
      accessibilityLabel={`View ${trainer.name}'s trainer profile`}
      onPress={onPress}
      style={styles.card}
    >
      <View style={styles.row}>
        <Avatar name={trainer.name} size="lg" uri={trainer.photoUri} />
        <View style={styles.meta}>
          <View style={styles.nameRow}>
            <Text numberOfLines={1} style={styles.name}>
              {trainer.name}
            </Text>
            {trainer.verified ? (
              <View style={styles.verifiedPill}>
                <Ionicons
                  color={theme.colors.primary}
                  name="checkmark-circle"
                  size={12}
                />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            ) : null}
          </View>
          <StarRating count={trainer.sessionsCount} value={trainer.rating} />
          <Text numberOfLines={1} style={styles.specialty}>
            {trainer.specialties.join(" · ")}
          </Text>
          {trainer.available ? null : (
            <Text style={styles.busy}>Fully booked today</Text>
          )}
        </View>
      </View>
      {onBook ? (
        <Button
          accessibilityLabel={`Book a class with ${trainer.name}`}
          disabled={!trainer.available}
          fullWidth={false}
          onPress={onBook}
          size="md"
          style={styles.bookButton}
          variant="secondary"
        >
          {trainer.available ? "Book" : "Busy"}
        </Button>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create((theme) => ({
  card: {
    gap: theme.spacing.md,
  },
  row: {
    flexDirection: "row",
    gap: theme.spacing.md,
  },
  meta: {
    flex: 1,
    gap: 4,
    justifyContent: "center",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
  },
  name: {
    fontFamily: theme.fontFamily.title,
    fontSize: theme.fontSize.base,
    color: theme.colors.foreground,
    flexShrink: 1,
  },
  verifiedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: theme.colors.accent,
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: theme.spacing.xs + 2,
    paddingVertical: 2,
  },
  verifiedText: {
    fontFamily: theme.fontFamily.caption,
    fontSize: 10,
    color: theme.colors.primary,
  },
  specialty: {
    fontFamily: theme.fontFamily.body,
    fontSize: theme.fontSize.xs,
    color: theme.colors.mutedForeground,
  },
  busy: {
    fontFamily: theme.fontFamily.caption,
    fontSize: theme.fontSize.xs,
    color: theme.colors.warning,
  },
  bookButton: {
    alignSelf: "flex-start",
  },
}));
