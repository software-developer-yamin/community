import { useQuery } from "@tanstack/react-query";
import { Link } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from "react-native";
import { StyleSheet, useUnistyles } from "react-native-unistyles";

import { AccountRecovery } from "@/components/account-recovery";
import { Container } from "@/components/container";
import { authClient } from "@/lib/auth-client";
import { clearCallState } from "@/utils/call-state-storage";
import { orpc, queryClient } from "@/utils/orpc";

interface NotificationRow {
  hint: string;
  id: string;
  label: string;
}

const NOTIFICATION_ROWS: NotificationRow[] = [
  {
    id: "practice-reminders",
    label: "Practice reminders",
    hint: "Daily nudge to keep your streak.",
  },
  {
    id: "room-activity",
    label: "Room activity",
    hint: "When a topic room you follow starts.",
  },
  {
    id: "weekly-progress",
    label: "Weekly progress",
    hint: "Talk-time summary each Sunday.",
  },
];

export default function SettingsScreen() {
  const theme = useUnistyles().theme;
  const session = authClient.useSession();
  const profile = useQuery({ ...orpc.rebuild.getProfile.queryOptions() });

  const [recoveryDismissed, setRecoveryDismissed] = useState(false);

  const signedIn = Boolean(session.data?.user);
  const needsRecovery =
    signedIn &&
    profile.isSuccess &&
    profile.data === null &&
    !recoveryDismissed;

  const handleSignOut = async () => {
    try {
      await clearCallState();
    } catch {
      // Non-critical: stale call state should not block sign-out.
    }
    await authClient.signOut();
    queryClient.invalidateQueries();
  };

  const handleRecoveryComplete = () => {
    setRecoveryDismissed(true);
    queryClient.invalidateQueries();
  };

  return (
    <Container>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.subtitle}>
            Account, notifications, recovery, and appearance.
          </Text>
        </View>

        {signedIn ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Account</Text>
            {session.data?.user?.email ? (
              <Text style={styles.accountEmail}>{session.data.user.email}</Text>
            ) : null}
            <Pressable
              accessibilityHint="Signs out of your AceFluency account and clears any active call state."
              accessibilityLabel="Sign out"
              accessibilityRole="button"
              onPress={handleSignOut}
              style={({ pressed }) => [
                styles.signOutButton,
                pressed && styles.signOutButtonPressed,
              ]}
            >
              <Text style={styles.signOutText}>Sign out</Text>
            </Pressable>
            <Link asChild href="/(drawer)/subscription">
              <Pressable
                accessibilityHint="Open subscription and billing options."
                accessibilityLabel="Manage billing"
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.linkRow,
                  pressed && styles.linkRowPressed,
                ]}
              >
                <Text style={styles.linkRowText}>Manage billing</Text>
                <Text style={styles.linkRowChevron}>›</Text>
              </Pressable>
            </Link>
          </View>
        ) : null}

        {needsRecovery ? (
          <View style={styles.recoveryCard}>
            <Text style={styles.cardTitle}>Restore account</Text>
            <Text style={styles.recoveryHint}>
              Your profile was suspended or disconnected. Link your phone to
              restore access.
            </Text>
            <AccountRecovery onComplete={handleRecoveryComplete} />
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Notifications</Text>
          <Text style={styles.sectionHint}>
            Coming soon. Your device stays quiet until the backend can deliver
            these reliably.
          </Text>
          {NOTIFICATION_ROWS.map((row) => (
            <View key={row.id} style={styles.notifRow}>
              <View style={styles.notifMeta}>
                <Text style={styles.notifLabel}>{row.label}</Text>
                <Text style={styles.notifHint}>{row.hint}</Text>
              </View>
              <Switch
                disabled
                thumbColor={theme.colors.mutedForeground}
                trackColor={{
                  false: theme.colors.accent,
                  true: theme.colors.accent,
                }}
                value={false}
              />
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Appearance</Text>
          <Text style={styles.sectionHint}>
            Your device controls dark mode. Appearance follows system settings.
          </Text>
        </View>

        <Link asChild href="/(drawer)/ticket">
          <Pressable
            accessibilityHint="Reach the support team about account or call issues."
            accessibilityLabel="Open a support ticket"
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.supportRow,
              pressed && styles.supportRowPressed,
            ]}
          >
            <Text style={styles.supportText}>Open a support ticket</Text>
            <Text style={styles.supportChevron}>›</Text>
          </Pressable>
        </Link>

        {session.isPending || profile.isPending ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={theme.colors.mutedForeground} />
          </View>
        ) : null}
      </ScrollView>
    </Container>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
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
  card: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  cardTitle: {
    color: theme.colors.foreground,
    fontSize: theme.fontSize.lg,
    fontWeight: "600",
    marginBottom: theme.spacing.sm,
  },
  accountEmail: {
    color: theme.colors.mutedForeground,
    fontSize: theme.fontSize.base,
    marginBottom: theme.spacing.md,
  },
  signOutButton: {
    backgroundColor: theme.colors.destructiveSurface,
    borderColor: theme.colors.destructive,
    borderWidth: 1,
    borderRadius: theme.borderRadius.none,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  signOutButtonPressed: {
    opacity: 0.7,
  },
  signOutText: {
    color: theme.colors.destructiveForeground,
    fontSize: theme.fontSize.base,
    fontWeight: "600",
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 48,
    paddingVertical: theme.spacing.sm,
    marginTop: theme.spacing.sm,
    borderTopColor: theme.colors.border,
    borderTopWidth: 1,
  },
  linkRowPressed: {
    opacity: 0.7,
  },
  linkRowText: {
    color: theme.colors.foreground,
    fontSize: theme.fontSize.base,
  },
  linkRowChevron: {
    color: theme.colors.mutedForeground,
    fontSize: theme.fontSize.xl,
  },
  recoveryCard: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  recoveryHint: {
    color: theme.colors.mutedForeground,
    fontSize: theme.fontSize.sm,
    marginBottom: theme.spacing.md,
  },
  sectionHint: {
    color: theme.colors.mutedForeground,
    fontSize: theme.fontSize.sm,
    marginBottom: theme.spacing.md,
  },
  notifRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 48,
    paddingVertical: theme.spacing.sm,
    borderTopColor: theme.colors.border,
    borderTopWidth: 1,
  },
  notifMeta: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  notifLabel: {
    color: theme.colors.foreground,
    fontSize: theme.fontSize.base,
  },
  notifHint: {
    color: theme.colors.mutedForeground,
    fontSize: theme.fontSize.xs,
    marginTop: 2,
  },
  supportRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 48,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.card,
  },
  supportRowPressed: {
    opacity: 0.7,
  },
  supportText: {
    color: theme.colors.foreground,
    fontSize: theme.fontSize.base,
  },
  supportChevron: {
    color: theme.colors.mutedForeground,
    fontSize: theme.fontSize.xl,
  },
  loadingWrap: {
    paddingVertical: theme.spacing.lg,
    alignItems: "center",
  },
}));
