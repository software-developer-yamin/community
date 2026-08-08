import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

const MAX_STARS = 5;

export function StarRating({
  value,
  count,
  size = 14,
}: {
  /** 0–5 */
  value: number;
  /** optional review count shown after the rating */
  count?: number;
  size?: number;
}) {
  const { theme } = useUnistyles();
  const stars = Array.from(
    { length: MAX_STARS },
    (_, i) => i < Math.round(value)
  );

  return (
    <View style={styles.row}>
      <View style={styles.starsRow}>
        {stars.map((filled, i) => (
          <Ionicons
            color={theme.colors.aurum}
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length star row never reorders
            key={i}
            name={filled ? "star" : "star-outline"}
            size={size}
          />
        ))}
      </View>
      <Text style={styles.value}>{value.toFixed(1)}</Text>
      {count === undefined ? null : <Text style={styles.count}>({count})</Text>}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
  },
  starsRow: {
    flexDirection: "row",
    gap: 1,
  },
  value: {
    fontFamily: theme.fontFamily.caption,
    fontSize: theme.fontSize.xs,
    color: theme.colors.foreground,
  },
  count: {
    fontFamily: theme.fontFamily.caption,
    fontSize: theme.fontSize.xs,
    color: theme.colors.mutedForeground,
  },
}));
