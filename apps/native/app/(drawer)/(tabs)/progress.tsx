import { ScrollView, Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { Container } from "@/components/container";

export default function ProgressTabScreen() {
  return (
    <Container>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Progress</Text>
          <Text style={styles.subtitle}>
            Talk-time, streaks, and level advancement.
          </Text>
        </View>
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>Coming soon.</Text>
        </View>
      </ScrollView>
    </Container>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    padding: theme.spacing.lg,
  },
  header: {
    paddingVertical: theme.spacing.xl,
  },
  title: {
    color: theme.colors.foreground,
    fontSize: theme.fontSize["3xl"],
    fontWeight: "700",
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    color: theme.colors.mutedForeground,
    fontSize: theme.fontSize.lg,
  },
  placeholder: {
    alignItems: "center",
    paddingVertical: theme.spacing.xxl,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  placeholderText: {
    color: theme.colors.mutedForeground,
    fontSize: theme.fontSize.base,
  },
}));
