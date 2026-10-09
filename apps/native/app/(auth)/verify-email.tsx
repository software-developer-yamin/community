import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { Button } from "@/components/ui/button";
import { FormScreenShell } from "@/components/ui/screen-shell";

type VerificationStatus = "verifying" | "verified" | "failed";

const SUCCESS_COPY: Record<string, string> = {
  verify: "Your email is verified. Welcome to AceFluency.",
  "change-email": "Your new email address is verified.",
  "callback-url": "Your email is verified. You can close this screen.",
};

const FAILURE_COPY: Record<string, string> = {
  "expired-token": "This verification link has expired. Request a new one.",
  "invalid-token": "This verification link is no longer valid.",
  "already-verified": "This email was already verified — just sign in.",
};

/** Landing screen for Better Auth's email verification callback. */
export default function VerifyEmail() {
  const router = useRouter();
  const { status, error } = useLocalSearchParams<{
    status?: string;
    error?: string;
  }>();

  const [state, setState] = useState<VerificationStatus>("verifying");

  useEffect(() => {
    if (status === "success") {
      setState("verified");
      return;
    }
    if (status || error) {
      setState("failed");
      return;
    }
    setState("verifying");
  }, [error, status]);

  if (state === "verifying") {
    return (
      <FormScreenShell>
        <View style={styles.center}>
          <Text accessibilityRole="header" style={styles.title}>
            Confirming your email
          </Text>
          <Text style={styles.subtitle}>
            Hold tight — this only takes a moment.
          </Text>
        </View>
      </FormScreenShell>
    );
  }

  const isVerified = state === "verified";
  const reason = error ?? status;

  return (
    <FormScreenShell>
      <View style={styles.center}>
        <LinearGradient
          colors={["#6C4DFF", "#FF6B4A"]}
          end={{ x: 1, y: 1 }}
          start={{ x: 0, y: 0 }}
          style={styles.badge}
        >
          <Ionicons
            color="#FFFFFF"
            name={isVerified ? "checkmark-circle" : "alert-circle"}
            size={40}
          />
        </LinearGradient>

        <Text accessibilityRole="header" style={styles.title}>
          {isVerified ? "Email verified" : "Verification failed"}
        </Text>
        <Text style={styles.subtitle}>
          {isVerified
            ? (SUCCESS_COPY[reason ?? "verify"] ??
              SUCCESS_COPY.verify ??
              "Your email is verified.")
            : (FAILURE_COPY[reason ?? ""] ??
              "We could not verify this email. Try requesting a new link.")}
        </Text>

        <View style={styles.actions}>
          {isVerified ? (
            <Button onPress={() => router.replace("/(app)")} variant="primary">
              Continue
            </Button>
          ) : null}

          <Button
            accessibilityHint="Goes to the sign-in screen"
            onPress={() => router.replace("/(auth)/login")}
            variant={isVerified ? "ghost" : "primary"}
          >
            Back to sign in
          </Button>

          <Button
            accessibilityHint="Resends the verification email"
            onPress={() => router.replace("/(auth)/login")}
            variant="ghost"
          >
            Resend verification email
          </Button>
        </View>
      </View>
    </FormScreenShell>
  );
}

const styles = StyleSheet.create((theme) => ({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.md,
  },
  badge: {
    alignItems: "center",
    justifyContent: "center",
    width: 88,
    height: 88,
    borderRadius: theme.borderRadius.full,
  },
  title: {
    fontFamily: theme.fontFamily.display,
    fontSize: theme.fontSize["3xl"],
    color: theme.colors.foreground,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: theme.fontFamily.body,
    fontSize: theme.fontSize.base,
    color: theme.colors.mutedForeground,
    textAlign: "center",
  },
  actions: {
    width: "100%",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
}));
