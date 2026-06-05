import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Pressable } from "react-native";
import { StyleSheet } from "react-native-unistyles";

export const HeaderButton = ({ onPress }: { onPress?: () => void }) => (
  <Pressable onPress={onPress} style={styles.button}>
    {({ pressed }) => (
      <FontAwesome
        color={styles.icon.color}
        name="info-circle"
        size={20}
        style={{
          opacity: pressed ? 0.7 : 1,
        }}
      />
    )}
  </Pressable>
);

const styles = StyleSheet.create((theme) => ({
  button: {
    padding: theme.spacing.sm,
    marginRight: theme.spacing.sm,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: `${theme.colors.secondary}80`, // 50% opacity
  },
  icon: {
    color: theme.colors.secondaryForeground,
  },
}));
