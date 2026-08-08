import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { Container } from "@/components/container";
import { authClient } from "@/lib/auth-client";
import { clearCallState } from "@/utils/call-state-storage";
import { orpc, queryClient } from "@/utils/orpc";

const GENDER_OPTIONS = ["male", "female", "nonbinary", "undisclosed"] as const;

export default function ProfileScreen() {
  const { data: session } = authClient.useSession();
  const { data: profile } = useQuery(orpc.rebuild.getProfile.queryOptions());
  const { mutateAsync: updateProfile } = useMutation(
    orpc.rebuild.updateProfile.mutationOptions()
  );

  const [gender, setGender] = useState<string | undefined>(undefined);
  const [genderPreference, setGenderPreference] = useState<string | undefined>(
    undefined
  );
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  if (profile && !loaded) {
    setGender(profile.gender ?? undefined);
    setGenderPreference(profile.genderPreference ?? undefined);
    setLoaded(true);
  }

  const tier = session?.user?.role === "premium_plus" ? "premium_plus" : null;

  const handleSave = async (
    field: "gender" | "genderPreference",
    value: string | undefined
  ) => {
    setSaving(true);
    try {
      await updateProfile({ [field]: value ?? null });
      queryClient.invalidateQueries({
        queryKey: orpc.rebuild.getProfile.key(),
      });
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Failed to save"
      );
    } finally {
      setSaving(false);
    }
  };

  const renderOption = (
    field: "gender" | "genderPreference",
    label: string,
    current: string | undefined,
    onSelect: (value: string | undefined) => void
  ) => {
    const selected = current === label;
    return (
      <TouchableOpacity
        key={`${field}-${label}`}
        onPress={() => {
          const next = selected ? undefined : label;
          onSelect(next);
          handleSave(field, next);
        }}
        style={[styles.optionChip, selected && styles.optionChipSelected]}
      >
        <Text
          style={[styles.optionText, selected && styles.optionTextSelected]}
        >
          {label.charAt(0).toUpperCase() + label.slice(1)}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <Container>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Profile</Text>

        {session?.user ? (
          <>
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
            </View>

            <Text style={styles.sectionTitle}>Gender Identity</Text>
            <View style={styles.section}>
              <View style={styles.chipRow}>
                {GENDER_OPTIONS.map((option) =>
                  renderOption("gender", option, gender, setGender)
                )}
              </View>
              {saving && <Text style={styles.savingText}>Saving...</Text>}
            </View>

            <Text style={styles.sectionTitle}>Partner Gender Preference</Text>
            <View style={styles.section}>
              {tier === "premium_plus" ? (
                <>
                  <View style={styles.chipRow}>
                    <TouchableOpacity
                      onPress={() => {
                        setGenderPreference(undefined);
                        handleSave("genderPreference", undefined);
                      }}
                      style={[
                        styles.optionChip,
                        genderPreference === undefined &&
                          styles.optionChipSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          genderPreference === undefined &&
                            styles.optionTextSelected,
                        ]}
                      >
                        No preference
                      </Text>
                    </TouchableOpacity>
                    {GENDER_OPTIONS.map((option) =>
                      renderOption(
                        "genderPreference",
                        option,
                        genderPreference,
                        setGenderPreference
                      )
                    )}
                  </View>
                  {saving && <Text style={styles.savingText}>Saving...</Text>}
                </>
              ) : (
                <View style={styles.lockedCard}>
                  <Text style={styles.lockedText}>
                    Gender preference is available with Premium+ tier.
                  </Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              onPress={() => {
                clearCallState().catch(() => undefined);
                authClient.signOut();
                queryClient.invalidateQueries();
              }}
              style={styles.signOutButton}
            >
              <Text style={styles.signOutButtonText}>Sign Out</Text>
            </TouchableOpacity>
          </>
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
  optionChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  optionChipSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  optionText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.foreground,
  },
  optionTextSelected: {
    color: theme.colors.primaryForeground,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
  },
  savingText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.mutedForeground,
    marginTop: theme.spacing.sm,
  },
  lockedCard: {
    padding: theme.spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: "dashed",
  },
  lockedText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.mutedForeground,
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
