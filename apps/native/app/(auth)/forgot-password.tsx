import { Ionicons } from "@expo/vector-icons";
import { useForm } from "@tanstack/react-form";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import z from "zod";

import { Button } from "@/components/ui/button";
import { FormScreenShell } from "@/components/ui/screen-shell";
import { TextField } from "@/components/ui/text-field";
import { authClient } from "@/lib/auth-client";

const emailSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Enter a valid email address"),
});

export default function ForgotPassword() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      email: "",
    },
    validators: {
      onSubmit: emailSchema,
    },
    onSubmit: async ({ value }) => {
      setError(null);
      setSentTo(null);

      const email = value.email.trim();

      await authClient.requestPasswordReset(
        { email },
        {
          onError(authError) {
            setError(
              authError.error?.message || "Failed to send reset instructions"
            );
          },
          onSuccess() {
            setSentTo(email);
          },
        }
      );
    },
  });

  return (
    <FormScreenShell>
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.title}>
          Reset your password
        </Text>
        <Text style={styles.subtitle}>
          Enter your email and we will send you a link to choose a new password.
        </Text>
      </View>

      <form.Subscribe
        selector={(state) => ({
          canSubmit: state.canSubmit,
          isSubmitting: state.isSubmitting,
        })}
      >
        {({ canSubmit, isSubmitting }) => (
          <>
            {error ? (
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
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {sentTo ? (
              <View
                accessibilityLiveRegion="polite"
                accessibilityRole="alert"
                style={styles.successBanner}
              >
                <Ionicons
                  color="#17B978"
                  name="mail-outline"
                  size={18}
                  style={styles.errorIcon}
                />
                <Text style={styles.successText}>
                  If an account exists for {sentTo}, a reset link is on its way.
                </Text>
              </View>
            ) : null}

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
                    setSentTo(null);
                  }}
                  placeholder="you@example.com"
                  returnKeyType="done"
                  testID="forgot-password-email"
                  textContentType="emailAddress"
                  value={field.state.value}
                />
              )}
            </form.Field>

            <Button
              accessibilityHint="Sends a password reset link to your email"
              disabled={!canSubmit}
              loading={isSubmitting}
              onPress={form.handleSubmit}
            >
              Send reset link
            </Button>
          </>
        )}
      </form.Subscribe>

      <Button
        accessibilityHint="Goes to the sign-in screen"
        onPress={() => router.push("/(auth)/login")}
        variant="ghost"
      >
        Back to sign in
      </Button>
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
  successBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.infoSurface,
  },
  successText: {
    flex: 1,
    fontFamily: theme.fontFamily.caption,
    fontSize: theme.fontSize.sm,
    color: theme.colors.foreground,
  },
}));
