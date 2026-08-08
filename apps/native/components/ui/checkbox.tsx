import { Ionicons } from "@expo/vector-icons";
import { Pressable } from "react-native";
import { StyleSheet } from "react-native-unistyles";

export function Checkbox({
  checked,
  onChange,
  accessibilityLabel,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  accessibilityLabel: string;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      hitSlop={8}
      onPress={() => onChange(!checked)}
      style={[styles.box, checked && styles.boxChecked]}
    >
      {checked ? <Ionicons color="#FFFFFF" name="checkmark" size={16} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create((theme) => ({
  box: {
    width: 24,
    height: 24,
    borderRadius: theme.borderRadius.xs,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.card,
  },
  boxChecked: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
}));
