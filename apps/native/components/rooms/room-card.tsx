/**
 * RoomCard — directory listing row for the Rooms tab and search results.
 * Learn register (light) — this is browsing, not the in-session Stage.
 */
import { Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { Avatar } from "@/components/ui/avatar";
import { Badge, LiveDot } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  formatCount,
  getCategoryById,
  type RoomListing,
} from "@/lib/rooms-data";

export function RoomCard({
  room,
  onPress,
}: {
  room: RoomListing;
  onPress: () => void;
}) {
  const category = getCategoryById(room.categoryId);

  return (
    <Card
      accessibilityLabel={`${room.title}, hosted by ${room.hostName}`}
      onPress={onPress}
      style={styles.card}
    >
      <Avatar name={room.hostName} ring={room.live ? "live" : undefined} />
      <View style={styles.meta}>
        <View style={styles.titleRow}>
          <Text numberOfLines={1} style={styles.title}>
            {room.title}
          </Text>
          {room.live ? <LiveDot /> : null}
        </View>
        <View style={styles.subRow}>
          <Text numberOfLines={1} style={styles.subtitle}>
            {category?.label ?? "Room"} · from {room.hostName}
          </Text>
        </View>
        <View style={styles.statsRow}>
          <Text style={styles.statText}>
            {room.scheduledLabel ?? `${formatCount(room.followers)} followers`}
          </Text>
          <Text style={styles.statDot}>·</Text>
          <Text style={styles.statText}>{room.capacity} cap</Text>
          {room.hostBadge ? <Badge>{room.hostBadge}</Badge> : null}
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create((theme) => ({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
  },
  meta: {
    flex: 1,
    gap: 2,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  title: {
    flexShrink: 1,
    fontFamily: theme.fontFamily.title,
    fontSize: theme.fontSize.base,
    color: theme.colors.foreground,
  },
  subRow: {
    flexDirection: "row",
  },
  subtitle: {
    fontFamily: theme.fontFamily.body,
    fontSize: theme.fontSize.xs,
    color: theme.colors.mutedForeground,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    marginTop: 2,
  },
  statText: {
    fontFamily: theme.fontFamily.caption,
    fontSize: theme.fontSize.xs,
    color: theme.colors.mutedForeground,
  },
  statDot: {
    color: theme.colors.mutedForeground,
  },
}));
