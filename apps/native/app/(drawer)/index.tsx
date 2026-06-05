import { useQuery } from "@tanstack/react-query";
import { Link } from "expo-router";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { Container } from "@/components/container";
import { SignIn } from "@/components/sign-in";
import { SignUp } from "@/components/sign-up";
import { authClient } from "@/lib/auth-client";
import { orpc, queryClient } from "@/utils/orpc";

export default function Home() {
  const healthCheck = useQuery(orpc.healthCheck.queryOptions());
  const privateData = useQuery(orpc.privateData.queryOptions());
  const { data: session } = authClient.useSession();

  return (
    <Container>
      <ScrollView>
        <View style={styles.pageContainer}>
          <Text style={styles.headerTitle}>BETTER T STACK</Text>
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
                Join a LiveKit room to start a video call.
              </Text>
              <Link asChild href="/call/lobby">
                <TouchableOpacity style={styles.joinCallButton}>
                  <Text style={styles.joinCallButtonText}>
                    Join room: lobby
                  </Text>
                </TouchableOpacity>
              </Link>
            </View>
          ) : null}
          {!session?.user && (
            <>
              <SignIn />
              <SignUp />
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
}));
