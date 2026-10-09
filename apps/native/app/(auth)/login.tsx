import { Ionicons } from "@expo/vector-icons";
import { useForm } from "@tanstack/react-form";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import z from "zod";

import { AccountRecovery } from "@/components/account-recovery";
import { Button } from "@/components/ui/button";
import { FormScreenShell } from "@/components/ui/screen-shell";
import { TextField } from "@/components/ui/text-field";
import { authClient } from "@/lib/auth-client";
import { queryClient } from "@/utils/orpc";

const signInSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Enter a valid email address"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(8, "Use at least 8 characters"),
});

function FormError({ message }: { message: string | null }) {
  if (!message) {
    return null;
  }
  return (
    <View
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      style={styles.errorBanner}
    >
      <Ionicons
        color="#E23D42"
        name="alert-circle-outline"
        size={18}
        style={styles.errorIcon}
      />
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

export default function Login() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [googlePending, setGooglePending] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    validators: {
      onSubmit: signInSchema,
    },
    onSubmit: async ({ value }) => {
      await authClient.signIn.email(
        {
          email: value.email.trim(),
          password: value.password,
        },
        {
          onError(authError) {
            setError(authError.error?.message || "Failed to sign in");
          },
          onSuccess() {
            setError(null);
            queryClient.refetchQueries();
            router.replace("/(app)");
          },
        }
      );
    },
  });

  const handleGoogleSignIn = async () => {
    setGooglePending(true);
    setError(null);

    await authClient.signIn.social(
      { provider: "google" },
      {
        onError(authError) {
          setError(authError.error?.message || "Google sign-in failed");
          setGooglePending(false);
        },
        onSuccess() {
          setGooglePending(false);
          queryClient.refetchQueries();
          router.replace("/(app)");
        },
      }
    );
  };

  return (
    <FormScreenShell>
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.title}>
          Welcome back
        </Text>
        <Text style={styles.subtitle}>
          Sign in and pick up your fluency streak where you left it.
        </Text>
      </View>

      <form.Subscribe
        selector={(state) => ({
          isSubmitting: state.isSubmitting,
          canSubmit: state.canSubmit,
        })}
      >
        {({ isSubmitting, canSubmit }) => (
          <>
            <FormError message={error} />

            <form.Field name="email">
              {(field) => (
                <TextField
                  autoCapitalize="none"
                  autoComplete="email"
                  errorText={field.state.meta.errors?.[0]?.message ?? null}
                  icon="mail-outline"
                  keyboardType="email-address"
                  label="Email"
                  onBlur={field.handleBlur}
                  onChangeText={(next) => {
                    field.handleChange(next);
                    setError(null);
                  }}
                  placeholder="you@example.com"
                  returnKeyType="next"
                  testID="login-email"
                  textContentType="emailAddress"
                  value={field.state.value}
                />
              )}
            </form.Field>

            <form.Field name="password">
              {(field) => (
                <TextField
                  autoComplete="password"
                  errorText={field.state.meta.errors?.[0]?.message ?? null}
                  icon="lock-closed-outline"
                  label="Password"
                  onBlur={field.handleBlur}
                  onChangeText={(next) => {
                    field.handleChange(next);
                    setError(null);
                  }}
                  placeholder="At least 8 characters"
                  returnKeyType="done"
                  secureTextEntry
                  testID="login-password"
                  textContentType="password"
                  value={field.state.value}
                />
              )}
            </form.Field>

            <Button
              accessibilityHint="Signs you in with your email and password"
              disabled={!canSubmit}
              loading={isSubmitting}
              onPress={form.handleSubmit}
            >
              Sign in
            </Button>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerLabel}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            <Button
              accessibilityHint="Opens Google's sign-in flow in a browser"
              icon={
                <Ionicons
                  color="#6B6478"
                  name="logo-google"
                  size={18}
                  style={styles.googleIcon}
                />
              }
              loading={googlePending}
              onPress={handleGoogleSignIn}
              variant="secondary"
            >
              Continue with Google
            </Button>

            <Button
              accessibilityHint="Goes to the phone number sign-in screen"
              onPress={() => router.push("/(auth)/verify-phone")}
              variant="ghost"
            >
              Sign in with phone
            </Button>
          </>
        )}
      </form.Subscribe>

      <View style={styles.footerGroup}>
        <Button
          onPress={() => router.push("/(auth)/forgot-password")}
          variant="ghost"
        >
          Forgot password?
        </Button>

        <Button
          accessibilityHint="Goes to the account creation screen"
          onPress={() => router.push("/(auth)/signup")}
          variant="secondary"
        >
          Create an account
        </Button>

        <Button
          accessibilityHint="Shows the phone number account recovery form"
          accessibilityLabel="Recover a phone-only account"
          onPress={() => setShowRecovery((current) => !current)}
          variant="ghost"
        >
          {showRecovery ? "Hide account recovery" : "Recover my account"}
        </Button>

        {showRecovery ? (
          <AccountRecovery onComplete={() => setShowRecovery(false)} />
        ) : null}
      </View>
    </FormScreenShell>
  );
}

const styles = StyleSheet.create((theme) => ({
  header: {
    gap: theme.spacing.sm,
  },
  title: {
    fontFamily: theme.fontFamily.display,
    fontSize: theme.fontSize["3xl"],
    color: theme.colors.foreground,
  },
  subtitle: {
    fontFamily: theme.fontFamily.body,
    fontSize: theme.fontSize.base,
    color: theme.colors.mutedForeground,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.destructiveSurface,
  },
  errorIcon: {
    flexShrink: 0,
  },
  errorText: {
    flex: 1,
    fontFamily: theme.fontFamily.caption,
    fontSize: theme.fontSize.sm,
    color: theme.colors.destructive,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.border,
  },
  dividerLabel: {
    fontFamily: theme.fontFamily.caption,
    fontSize: theme.fontSize.xs,
    color: theme.colors.mutedForeground,
  },
  googleIcon: {
    flexShrink: 0,
  },
  footerGroup: {
    gap: theme.spacing.sm,
  },
}));
