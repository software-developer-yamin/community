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

import { authClient } from "@/lib/auth-client";
import { queryClient } from "@/utils/orpc";

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

const phoneSchema = z.object({
  phoneNumber: z
    .string()
    .trim()
    .min(1, "Phone number is required")
    .regex(
      /^\+?[1-9]\d{6,14}$/,
      "Enter a valid phone number (e.g., +8801712345678)"
    ),
});

const otpSchema = z.object({
  otp: z
    .string()
    .trim()
    .min(1, "Verification code is required")
    .regex(/^\d{4,8}$/, "Enter a valid verification code"),
});

type Step = "phone" | "otp";

export function PhoneSignIn() {
  const [step, setStep] = useState<Step>("phone");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const phoneForm = useForm({
    defaultValues: {
      phoneNumber: "",
    },
    validators: {
      onSubmit: phoneSchema,
    },
    onSubmit: async ({ value }) => {
      setError(null);
      setSuccess(null);

      await authClient.phoneNumber.sendOtp(
        { phoneNumber: value.phoneNumber.trim() },
        {
          onError(error_) {
            setError(
              error_.error?.message || "Failed to send verification code"
            );
          },
          onSuccess() {
            setPhoneNumber(value.phoneNumber.trim());
            setSuccess("Verification code sent!");
            setStep("otp");
          },
        }
      );
    },
  });

  const otpForm = useForm({
    defaultValues: {
      otp: "",
    },
    validators: {
      onSubmit: otpSchema,
    },
    onSubmit: async ({ value, formApi }) => {
      setError(null);
      setSuccess(null);

      const { error } = await authClient.phoneNumber.verify({
        phoneNumber,
        code: value.otp.trim(),
      });

      if (error) {
        setError(error.message ?? "Invalid verification code");
      } else {
        setError(null);
        formApi.reset();
        queryClient.refetchQueries();
      }
    },
  });

  if (step === "otp") {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Enter Verification Code</Text>
        <Text style={styles.subtitle}>Code sent to {phoneNumber}</Text>

        <otpForm.Subscribe
          selector={(state) => ({
            isSubmitting: state.isSubmitting,
            validationError: getErrorMessage(state.errorMap.onSubmit),
          })}
        >
          {({ isSubmitting, validationError }) => {
            const formError = error ?? validationError;

            return (
              <>
                {success ? (
                  <View style={styles.successContainer}>
                    <Text style={styles.successText}>{success}</Text>
                  </View>
                ) : null}

                {formError ? (
                  <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{formError}</Text>
                  </View>
                ) : null}

                <otpForm.Field name="otp">
                  {(field) => (
                    <TextInput
                      keyboardType="number-pad"
                      onBlur={field.handleBlur}
                      onChangeText={(value) => {
                        field.handleChange(value);
                        if (error) {
                          setError(null);
                        }
                      }}
                      onSubmitEditing={otpForm.handleSubmit}
                      placeholder="Verification code"
                      style={styles.input}
                      value={field.state.value}
                    />
                  )}
                </otpForm.Field>

                <TouchableOpacity
                  disabled={isSubmitting}
                  onPress={otpForm.handleSubmit}
                  style={styles.button}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.buttonText}>Verify & Sign In</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    setStep("phone");
                    setError(null);
                    setSuccess(null);
                  }}
                  style={styles.linkButton}
                >
                  <Text style={styles.linkText}>Use a different number</Text>
                </TouchableOpacity>
              </>
            );
          }}
        </otpForm.Subscribe>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign In with Phone</Text>

      <phoneForm.Subscribe
        selector={(state) => ({
          isSubmitting: state.isSubmitting,
          validationError: getErrorMessage(state.errorMap.onSubmit),
        })}
      >
        {({ isSubmitting, validationError }) => {
          const formError = error ?? validationError;

          return (
            <>
              {success ? (
                <View style={styles.successContainer}>
                  <Text style={styles.successText}>{success}</Text>
                </View>
              ) : null}

              {formError ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{formError}</Text>
                </View>
              ) : null}

              <phoneForm.Field name="phoneNumber">
                {(field) => (
                  <TextInput
                    keyboardType="phone-pad"
                    onBlur={field.handleBlur}
                    onChangeText={(value) => {
                      field.handleChange(value);
                      if (error) {
                        setError(null);
                      }
                    }}
                    placeholder="Phone number (e.g., +8801712345678)"
                    style={styles.input}
                    value={field.state.value}
                  />
                )}
              </phoneForm.Field>

              <TouchableOpacity
                disabled={isSubmitting}
                onPress={phoneForm.handleSubmit}
                style={styles.button}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.buttonText}>Send Verification Code</Text>
                )}
              </TouchableOpacity>
            </>
          );
        }}
      </phoneForm.Subscribe>
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
  subtitle: {
    fontSize: 14,
    color: theme.colors.typography,
    marginBottom: 16,
    opacity: 0.7,
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
  successContainer: {
    marginBottom: 16,
    padding: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.success ?? "#d4edda",
  },
  successText: {
    color: theme.colors.successForeground ?? "#155724",
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
  linkButton: {
    marginTop: 12,
    padding: 8,
    alignItems: "center",
  },
  linkText: {
    color: theme.colors.primary,
    fontSize: 14,
  },
}));
