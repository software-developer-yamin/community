import { NATIVE_LANG_MAP } from "@community/api/lib/native-lang";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { AccountRecovery } from "@/components/account-recovery";
import { Container } from "@/components/container";
import { GoogleSignIn } from "@/components/google-sign-in";
import { PhoneSignIn } from "@/components/phone-sign-in";
import { SignIn } from "@/components/sign-in";
import { SignUp } from "@/components/sign-up";
import { authClient } from "@/lib/auth-client";
import { orpc, queryClient } from "@/utils/orpc";

export default function Home() {
  const healthCheck = useQuery(orpc.healthCheck.queryOptions());
  const privateData = useQuery(orpc.privateData.queryOptions());
  const { data: session } = authClient.useSession();
  const profile = useQuery(orpc.rebuild.getProfile.queryOptions());

  const [recoveryDismissed, setRecoveryDismissed] = useState(false);
  const [pendingLang, setPendingLang] = useState<string | null>(null);

  const updateProfile = useMutation(
    orpc.rebuild.updateProfile.mutationOptions({
      async onSuccess() {
        setPendingLang(null);
        profile.refetch();

        // Trigger embedding recompute on language change
        try {
          await orpc.models.recomputeEmbedding({});
        } catch {
          // Non-critical; old embedding remains until next interaction
        }
      },
    })
  );

  const currentLang = profile.data?.nativeLanguage ?? "";

  // After sign-in, if session exists but profile is null, show account recovery prompt
  if (
    session?.user &&
    profile.isSuccess &&
    profile.data === null &&
    !recoveryDismissed
  ) {
    return (
      <Container>
        <ScrollView>
          <View style={styles.pageContainer}>
            <AccountRecovery
              onComplete={() => {
                setRecoveryDismissed(true);
                queryClient.invalidateQueries();
              }}
            />
          </View>
        </ScrollView>
      </Container>
    );
  }

  return (
    <Container>
      <ScrollView>
        <View style={styles.pageContainer}>
          <Text style={styles.headerTitle}>AceFluency</Text>
          {session?.user ? (
            <View style={styles.sessionInfoCard}>
              <View style={styles.sessionUserRow}>
                <Text style={styles.welcomeText}>
                  Welcome,{" "}
                  <Text style={styles.userNameText}>{session.user.name}</Text>
                </Text>
              </View>
              <Text style={styles.emailText}>{session.user.email}</Text>

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
          ) : null}

          {session?.user ? (
            <View style={styles.settingsCard}>
              <Text style={styles.cardTitle}>Profile Settings</Text>

              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Native Language</Text>
                <View style={styles.langRow}>
                  {NATIVE_LANG_MAP.map((lang) => {
                    const selected =
                      (pendingLang ?? currentLang) === lang.value;
                    return (
                      <TouchableOpacity
                        key={lang.key}
                        onPress={() => {
                          setPendingLang(lang.value);
                          updateProfile.mutate({
                            nativeLanguage: lang.value,
                          });
                        }}
                        style={[
                          styles.langChip,
                          selected && styles.langChipSelected,
                        ]}
                      >
                        {updateProfile.isPending && selected ? (
                          <ActivityIndicator color="#fff" size="small" />
                        ) : (
                          <Text
                            style={[
                              styles.langChipText,
                              selected && styles.langChipTextSelected,
                            ]}
                          >
                            {lang.label}
                          </Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>
          ) : null}
          <View style={styles.apiStatusCard}>
            <Text style={styles.cardTitle}>API Status</Text>
            <View style={styles.apiStatusRow}>
              <View
                style={[
                  styles.statusIndicatorDot,
                  healthCheck.data
                    ? styles.statusIndicatorGreen
                    : styles.statusIndicatorRed,
                ]}
              />
              <Text style={styles.mutedText}>
                {(() => {
                  if (healthCheck.isLoading) {
                    return "Checking...";
                  }
                  if (healthCheck.data) {
                    return "Connected to API";
                  }
                  return "API Disconnected";
                })()}
              </Text>
            </View>
          </View>
          <View style={styles.privateDataCard}>
            <Text style={styles.cardTitle}>Private Data</Text>
            {privateData && (
              <View>
                <Text style={styles.mutedText}>
                  {privateData.data?.message}
                </Text>
              </View>
            )}
          </View>
          {session?.user ? (
            <View style={styles.callCard}>
              <Text style={styles.cardTitle}>Live Calls</Text>
              <Text style={styles.mutedText}>
                Find a partner and practice English with live voice calls.
              </Text>
              <Link asChild href="/call/lobby">
                <TouchableOpacity style={styles.joinCallButton}>
                  <Text style={styles.joinCallButtonText}>Start a Call</Text>
                </TouchableOpacity>
              </Link>
            </View>
          ) : null}
          {!session?.user && (
            <>
              <SignIn />
              <SignUp />
              <PhoneSignIn />
              <GoogleSignIn />
            </>
          )}
        </View>
      </ScrollView>
    </Container>
  );
}

const styles = StyleSheet.create((theme) => ({
  pageContainer: {
    paddingHorizontal: 8,
  },
  headerTitle: {
    color: theme?.colors?.typography,
    fontSize: 30,
    fontWeight: "bold",
    marginBottom: 16,
  },
  sessionInfoCard: {
    marginBottom: 24,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme?.colors?.border,
  },
  sessionUserRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  welcomeText: {
    color: theme?.colors?.typography,
    fontSize: 16,
  },
  userNameText: {
    fontWeight: "500",
    color: theme?.colors?.typography,
  },
  emailText: {
    color: theme?.colors?.typography,
    fontSize: 14,
    marginBottom: 16,
  },
  signOutButton: {
    backgroundColor: theme?.colors?.destructive,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  signOutButtonText: {
    fontWeight: "500",
  },
  paymentActions: {
    marginTop: 12,
    gap: 8,
    alignItems: "flex-start",
  },
  polarPrimaryButton: {
    backgroundColor: theme?.colors?.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  polarPrimaryButtonText: {
    color: theme?.colors?.primaryForeground,
    fontWeight: "500",
  },
  polarSecondaryButton: {
    borderWidth: 1,
    borderColor: theme?.colors?.border,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  polarSecondaryButtonText: {
    color: theme?.colors?.typography,
    fontWeight: "500",
  },
  apiStatusCard: {
    marginBottom: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme?.colors?.border,
    padding: 16,
  },
  cardTitle: {
    marginBottom: 12,
    fontWeight: "500",
    color: theme?.colors?.typography,
  },
  apiStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusIndicatorDot: {
    height: 12,
    width: 12,
    borderRadius: 9999,
  },
  statusIndicatorGreen: {
    backgroundColor: theme.colors.success,
  },
  statusIndicatorRed: {
    backgroundColor: theme.colors.destructive,
  },
  mutedText: {
    color: theme?.colors?.typography,
  },
  privateDataCard: {
    marginBottom: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme?.colors?.border,
    padding: 16,
  },
  callCard: {
    marginBottom: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme?.colors?.border,
    padding: 16,
  },
  joinCallButton: {
    marginTop: 12,
    backgroundColor: theme?.colors?.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  joinCallButtonText: {
    color: theme?.colors?.primaryForeground,
    fontWeight: "500",
  },
  settingsCard: {
    marginBottom: 24,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme?.colors?.border,
  },
  settingRow: {
    marginBottom: 8,
  },
  settingLabel: {
    color: theme?.colors?.mutedForeground,
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  langRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  langChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme?.colors?.border,
    minWidth: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  langChipSelected: {
    backgroundColor: theme?.colors?.primary,
    borderColor: theme?.colors?.primary,
  },
  langChipText: {
    fontSize: 14,
    color: theme?.colors?.typography,
  },
  langChipTextSelected: {
    color: theme?.colors?.primaryForeground,
    fontWeight: "600",
  },
}));
