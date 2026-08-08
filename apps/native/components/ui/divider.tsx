import { View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

export function Divider({ inset = false }: { inset?: boolean }) {
  return <View style={[styles.line, inset && styles.inset]} />;
}

const styles = StyleSheet.create((theme) => ({
  line: {
    height: 1,
    backgroundColor: theme.colors.border,
  },
  inset: {
    marginLeft: theme.spacing.lg,
  },
}));
