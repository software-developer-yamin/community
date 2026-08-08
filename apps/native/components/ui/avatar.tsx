import { Image, Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

const SIZES = { sm: 36, md: 48, lg: 64, xl: 88 } as const;

export function Avatar({
  name,
  uri,
  size = "md",
  ring,
}: {
  name: string;
  uri?: string | null;
  size?: keyof typeof SIZES;
  /** "live" = speaking now, "streak" = active-streak ring, undefined = none */
  ring?: "live" | "streak";
}) {
  const dimension = SIZES[size];
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  const inner = uri ? (
    <Image
      accessibilityIgnoresInvertColors
      source={{ uri }}
      style={[
        styles.image,
        { width: dimension, height: dimension, borderRadius: dimension / 2 },
      ]}
    />
  ) : (
    <View
      style={[
        styles.fallback,
        { width: dimension, height: dimension, borderRadius: dimension / 2 },
      ]}
    >
      <Text style={[styles.initial, { fontSize: dimension * 0.4 }]}>
        {initial}
      </Text>
    </View>
  );

  if (!ring) {
    return inner;
  }

  const ringSize = dimension + 6;
  return (
    <View
      style={[
        ring === "live" ? styles.liveRing : styles.streakRing,
        {
          width: ringSize,
          height: ringSize,
          borderRadius: ringSize / 2,
          padding: 3,
        },
      ]}
    >
      {inner}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  image: {
    backgroundColor: theme.colors.muted,
  },
  fallback: {
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  initial: {
    fontFamily: theme.fontFamily.bodyStrong,
    color: "#FFFFFF",
  },
  liveRing: {
    borderWidth: 2,
    borderColor: theme.colors.success,
    alignItems: "center",
    justifyContent: "center",
  },
  streakRing: {
    borderWidth: 2,
    borderColor: theme.colors.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
}));
