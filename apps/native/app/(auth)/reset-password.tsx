import { Ionicons } from "@expo/vector-icons";
import { useForm } from "@tanstack/react-form";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import z from "zod";

import { Button } from "@/components/ui/button";
import { FormScreenShell } from "@/components/ui/screen-shell";
import { TextField } from "@/components/ui/text-field";
import { authClient } from "@/lib/auth-client";

const resetPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(1, "Password is required")
      .min(8, "Use at least 8 characters"),
    confirmPassword: z.string().min(1, "Confirm your new password"),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export default function ResetPassword() {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token?: string }>();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const form = useForm({
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
    validators: {
      onSubmit: resetPasswordSchema,
    },
    onSubmit: async ({ value, formApi }) => {
      setError(null);

      const { error: resetError } = await authClient.resetPassword({
        newPassword: value.newPassword,
        ...(token ? { token } : {}),
      });

      if (resetError) {
        setError(resetError.message ?? "Failed to reset your password");
        return;
      }

      formApi.reset();
      setDone(true);
    },
  });

  if (done) {
    return (
      <FormScreenShell>
        <View style={styles.center}>
          <Ionicons
            accessibilityElementsHidden
            color="#17B978"
            name="checkmark-circle"
            size={56}
          />
          <Text accessibilityRole="header" style={styles.title}>
            Password updated
          </Text>
          <Text style={styles.subtitle}>
            Your new password is ready. Sign in to continue your streak.
          </Text>
          <Button onPress={() => router.replace("/(auth)/login")}>
            Go to sign in
          </Button>
        </View>
      </FormScreenShell>
    );
  }

  return (
    <FormScreenShell>
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.title}>
          Choose a new password
        </Text>
        <Text style={styles.subtitle}>
          Pick something you have not used before on AceFluency.
        </Text>
      </View>

      {token ? null : (
        <View
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
          style={styles.noticeBanner}
        >
          <Ionicons
            color="#F5A623"
            name="information-circle-outline"
            size={18}
            style={styles.bannerIcon}
          />
          <Text style={styles.noticeText}>
            Open this screen from the reset link in your email so we can verify
            the request.
          </Text>
        </View>
      )}

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
                  style={styles.bannerIcon}
                />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <form.Field name="newPassword">
              {(field) => (
                <TextField
                  autoComplete="password"
                  errorText={field.state.meta.errors?.[0]?.message ?? null}
                  helperText="At least 8 characters"
                  icon="lock-closed-outline"
                  label="New password"
                  onBlur={field.handleBlur}
                  onChangeText={(next) => {
                    field.handleChange(next);
                    setError(null);
                  }}
                  placeholder="Choose a password"
                  returnKeyType="next"
                  secureTextEntry
                  testID="reset-new-password"
                  textContentType="password"
                  value={field.state.value}
                />
              )}
            </form.Field>

            <form.Field name="confirmPassword">
              {(field) => (
                <TextField
                  autoComplete="password"
                  errorText={field.state.meta.errors?.[0]?.message ?? null}
                  icon="shield-checkmark-outline"
                  label="Confirm new password"
                  onBlur={field.handleBlur}
                  onChangeText={(next) => {
                    field.handleChange(next);
                    setError(null);
                  }}
                  placeholder="Repeat your password"
                  returnKeyType="done"
                  secureTextEntry
                  testID="reset-confirm-password"
                  textContentType="password"
                  value={field.state.value}
                />
              )}
            </form.Field>

            <Button
              accessibilityHint="Saves your new password"
              disabled={!canSubmit}
              loading={isSubmitting}
              onPress={form.handleSubmit}
            >
              Update password
            </Button>
          </>
        )}
      </form.Subscribe>

      <Button
        accessibilityHint="Goes back to the sign-in screen"
        onPress={() => router.replace("/(auth)/login")}
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
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.md,
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
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.destructiveSurface,
  },
  noticeBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.warningSurface,
  },
  bannerIcon: {
    flexShrink: 0,
  },
  errorText: {
    flex: 1,
    fontFamily: theme.fontFamily.caption,
    fontSize: theme.fontSize.sm,
    color: theme.colors.destructive,
  },
  noticeText: {
    flex: 1,
    fontFamily: theme.fontFamily.caption,
    fontSize: theme.fontSize.sm,
    color: theme.colors.foreground,
  },
}));
