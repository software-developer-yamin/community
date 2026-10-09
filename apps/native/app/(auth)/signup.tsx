import { NATIVE_LANG_MAP } from "@community/api/lib/native-lang";
import { Ionicons } from "@expo/vector-icons";
import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import z from "zod";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { FormScreenShell } from "@/components/ui/screen-shell";
import { TextField } from "@/components/ui/text-field";
import { authClient } from "@/lib/auth-client";
import { orpc, queryClient } from "@/utils/orpc";

const signUpSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .min(2, "Name must be at least 2 characters"),
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

export default function Signup() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [nativeLanguage, setNativeLanguage] = useState<string>("");

  const updateProfile = useMutation(
    orpc.rebuild.updateProfile.mutationOptions()
  );

  const form = useForm({
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
    validators: {
      onSubmit: signUpSchema,
    },
    onSubmit: async ({ value, formApi }) => {
      await authClient.signUp.email(
        {
          name: value.name.trim(),
          email: value.email.trim(),
          password: value.password,
        },
        {
          onError(authError) {
            setError(authError.error?.message || "Failed to sign up");
          },
          async onSuccess() {
            setError(null);
            formApi.reset();

            if (nativeLanguage) {
              try {
                await updateProfile.mutateAsync({ nativeLanguage });
              } catch {
                // Profile is lazily created; the language is set again on first save.
              }
            }

            queryClient.refetchQueries();
            router.replace("/(auth)/onboarding/welcome");
          },
        }
      );
    },
  });

  return (
    <FormScreenShell>
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.title}>
          Start speaking today
        </Text>
        <Text style={styles.subtitle}>
          Create your account and get your first practice session queued up.
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
            <FormError message={error} />

            <form.Field name="name">
              {(field) => (
                <TextField
                  autoCapitalize="words"
                  autoComplete="name"
                  errorText={field.state.meta.errors?.[0]?.message ?? null}
                  icon="person-outline"
                  label="Name"
                  onBlur={field.handleBlur}
                  onChangeText={(next) => {
                    field.handleChange(next);
                    setError(null);
                  }}
                  placeholder="How should we greet you?"
                  returnKeyType="next"
                  testID="signup-name"
                  textContentType="name"
                  value={field.state.value}
                />
              )}
            </form.Field>

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
                  testID="signup-email"
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
                  helperText="At least 8 characters"
                  icon="lock-closed-outline"
                  label="Password"
                  onBlur={field.handleBlur}
                  onChangeText={(next) => {
                    field.handleChange(next);
                    setError(null);
                  }}
                  placeholder="Choose a password"
                  returnKeyType="done"
                  secureTextEntry
                  testID="signup-password"
                  textContentType="password"
                  value={field.state.value}
                />
              )}
            </form.Field>

            <View style={styles.languageGroup}>
              <Text style={styles.languageLabel}>Native language</Text>
              <Text style={styles.languageHint}>
                Optional — we tune your corrections to it.
              </Text>
              <View style={styles.chipRow}>
                {NATIVE_LANG_MAP.map((lang) => {
                  const selected = nativeLanguage === lang.value;
                  return (
                    <Chip
                      key={lang.key}
                      label={lang.label}
                      onPress={() =>
                        setNativeLanguage(selected ? "" : lang.value)
                      }
                      selected={selected}
                    />
                  );
                })}
              </View>
            </View>

            <Button
              accessibilityHint="Creates your AceFluency account"
              disabled={!canSubmit}
              loading={isSubmitting}
              onPress={form.handleSubmit}
            >
              Create account
            </Button>
          </>
        )}
      </form.Subscribe>

      <View style={styles.footerGroup}>
        <Text style={styles.footerText}>Already have an account?</Text>
        <Button
          accessibilityHint="Goes to the sign-in screen"
          onPress={() => router.push("/(auth)/login")}
          variant="ghost"
        >
          Sign in
        </Button>
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
  languageGroup: {
    gap: theme.spacing.sm,
  },
  languageLabel: {
    fontFamily: theme.fontFamily.label,
    fontSize: theme.fontSize.sm,
    color: theme.colors.foreground,
  },
  languageHint: {
    fontFamily: theme.fontFamily.caption,
    fontSize: theme.fontSize.xs,
    color: theme.colors.mutedForeground,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
  },
  footerGroup: {
    alignItems: "center",
    gap: theme.spacing.xs,
  },
  footerText: {
    fontFamily: theme.fontFamily.caption,
    fontSize: theme.fontSize.sm,
    color: theme.colors.mutedForeground,
  },
}));
