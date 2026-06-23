import { useForm } from "@tanstack/react-form";
import { useState } from "react";
import {
  ActivityIndicator,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { StyleSheet } from "react-native-unistyles";
import z from "zod";

import { NATIVE_LANG_MAP } from "@community/api/lib/native-lang";

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

function getErrorMessage(error: unknown): string | null {
  if (!error) {
    return null;
  }

  if (typeof error === "string") {
    return error;
  }

  if (Array.isArray(error)) {
    for (const issue of error) {
      const message = getErrorMessage(issue);
      if (message) {
        return message;
      }
    }
    return null;
  }

  if (typeof error === "object" && error !== null) {
    const maybeError = error as { message?: unknown };
    if (typeof maybeError.message === "string") {
      return maybeError.message;
    }
  }

  return null;
}

export function SignUp() {
  const [error, setError] = useState<string | null>(null);
  const [nativeLanguage, setNativeLanguage] = useState<string>("");

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
          onError(error) {
            setError(error.error?.message || "Failed to sign up");
          },
          async onSuccess() {
            setError(null);
            formApi.reset();

            // Save native language if selected — profile is lazily created
            if (nativeLanguage) {
              try {
                await orpc.rebuild.updateProfile({
                  nativeLanguage,
                });
              } catch {
                // Profile may not exist yet; created on first save
              }
            }

            queryClient.refetchQueries();
          },
        }
      );
    },
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Account</Text>

      <form.Subscribe
        selector={(state) => ({
          isSubmitting: state.isSubmitting,
          validationError: getErrorMessage(state.errorMap.onSubmit),
        })}
      >
        {({ isSubmitting, validationError }) => {
          const formError = error ?? validationError;

          return (
            <>
              {formError ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{formError}</Text>
                </View>
              ) : null}

              <form.Field name="name">
                {(field) => (
                  <TextInput
                    onBlur={field.handleBlur}
                    onChangeText={(value) => {
                      field.handleChange(value);
                      if (error) {
                        setError(null);
                      }
                    }}
                    placeholder="Name"
                    style={styles.input}
                    value={field.state.value}
                  />
                )}
              </form.Field>

              <form.Field name="email">
                {(field) => (
                  <TextInput
                    autoCapitalize="none"
                    keyboardType="email-address"
                    onBlur={field.handleBlur}
                    onChangeText={(value) => {
                      field.handleChange(value);
                      if (error) {
                        setError(null);
                      }
                    }}
                    placeholder="Email"
                    style={styles.input}
                    value={field.state.value}
                  />
                )}
              </form.Field>

              <form.Field name="password">
                {(field) => (
                  <TextInput
                    onBlur={field.handleBlur}
                    onChangeText={(value) => {
                      field.handleChange(value);
                      if (error) {
                        setError(null);
                      }
                    }}
                    onSubmitEditing={form.handleSubmit}
                    placeholder="Password"
                    secureTextEntry
                    style={styles.inputLast}
                    value={field.state.value}
                  />
                )}
              </form.Field>

              <View style={styles.nativeLangSection}>
                <Text style={styles.nativeLangLabel}>Native Language</Text>
                <View style={styles.langRow}>
                  {NATIVE_LANG_MAP.map((lang) => {
                    const selected = nativeLanguage === lang.value;
                    return (
                      <TouchableOpacity
                        key={lang.key}
                        onPress={() => setNativeLanguage(selected ? "" : lang.value)}
                        style={[
                          styles.langChip,
                          selected && styles.langChipSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.langChipText,
                            selected && styles.langChipTextSelected,
                          ]}
                        >
                          {lang.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <TouchableOpacity
                disabled={isSubmitting}
                onPress={form.handleSubmit}
                style={styles.button}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.buttonText}>Sign Up</Text>
                )}
              </TouchableOpacity>
            </>
          );
        }}
      </form.Subscribe>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    marginTop: 24,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.typography,
    marginBottom: 16,
  },
  errorContainer: {
    marginBottom: 16,
    padding: 12,
    borderRadius: 6,
  },
  errorText: {
    color: theme.colors.destructive,
    fontSize: 14,
  },
  input: {
    marginBottom: 12,
    padding: 16,
    borderRadius: 6,
    color: theme.colors.typography,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  inputLast: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 6,
    color: theme.colors.typography,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  button: {
    backgroundColor: theme.colors.primary,
    padding: 16,
    borderRadius: 6,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    fontWeight: "500",
  },
  nativeLangSection: {
    marginBottom: 16,
  },
  nativeLangLabel: {
    color: theme.colors.mutedForeground,
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 8,
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
    borderColor: theme.colors.border,
  },
  langChipSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  langChipText: {
    fontSize: 14,
    color: theme.colors.typography,
  },
  langChipTextSelected: {
    color: theme.colors.primaryForeground,
    fontWeight: "600",
  },
}));
