import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { Container } from "@/components/container";
import { authClient } from "@/lib/auth-client";
import { queryClient } from "@/utils/orpc";

export default function ProfileScreen() {
  const { data: session } = authClient.useSession();

  return (
    <Container>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Profile</Text>

        {session?.user ? (
          <View style={styles.section}>
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Name</Text>
              <Text style={styles.infoValue}>{session.user.name}</Text>
            </View>

            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>
                {session.user.email}
                {session.user.emailVerified ? " (verified)" : ""}
              </Text>
            </View>

            {session.user.role !== "user" && (
              <View style={styles.infoCard}>
                <Text style={styles.infoLabel}>Role</Text>
                <Text style={styles.infoValue}>{session.user.role}</Text>
              </View>
            )}

            <TouchableOpacity
              onPress={() => {
                authClient.signOut();
                queryClient.invalidateQueries();
              }}
              style={styles.signOutButton}
            >
              <Text style={styles.signOutButtonText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={styles.mutedText}>Sign in to view your profile.</Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.section}>
          <Text style={styles.mutedText}>
            AceFluency helps you practice English through live conversations
            with partners at your level.
          </Text>
        </View>
      </ScrollView>
    </Container>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    padding: theme.spacing.lg,
  },
  title: {
    fontSize: theme.fontSize["3xl"],
    fontWeight: "bold",
    color: theme.colors.foreground,
    marginBottom: theme.spacing.xl,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: "600",
    color: theme.colors.foreground,
    marginBottom: theme.spacing.md,
  },
  infoCard: {
    padding: theme.spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.sm,
  },
  infoLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.mutedForeground,
    marginBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  infoValue: {
    fontSize: theme.fontSize.base,
    color: theme.colors.foreground,
  },
  mutedText: {
    fontSize: theme.fontSize.base,
    color: theme.colors.mutedForeground,
    lineHeight: 22,
  },
  signOutButton: {
    marginTop: theme.spacing.lg,
    padding: theme.spacing.md,
    borderRadius: 8,
    backgroundColor: theme.colors.destructive,
    alignItems: "center",
  },
  signOutButtonText: {
    color: theme.colors.destructiveForeground,
    fontWeight: "600",
    fontSize: theme.fontSize.base,
  },
}));
