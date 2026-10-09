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
import { queryClient } from "@/utils/orpc";

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

function Banner({
  message,
  tone,
}: {
  message: string | null;
  tone: "error" | "success";
}) {
  if (!message) {
    return null;
  }
  const isError = tone === "error";
  return (
    <View
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      style={[
        styles.banner,
        isError ? styles.bannerError : styles.bannerSuccess,
      ]}
    >
      <Ionicons
        color={isError ? "#E23D42" : "#17B978"}
        name={isError ? "alert-circle-outline" : "checkmark-circle-outline"}
        size={18}
        style={styles.bannerIcon}
      />
      <Text style={isError ? styles.bannerErrorText : styles.bannerSuccessText}>
        {message}
      </Text>
    </View>
  );
}

export default function VerifyPhone() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("phone");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const phoneForm = useForm({
    defaultValues: {
      phoneNumber: "",
    },
    validators: {
      onSubmit: phoneSchema,
    },
    onSubmit: async ({ value }) => {
      setError(null);
      setNotice(null);

      await authClient.phoneNumber.sendOtp(
        { phoneNumber: value.phoneNumber.trim() },
        {
          onError(authError) {
            setError(
              authError.error?.message || "Failed to send verification code"
            );
          },
          onSuccess() {
            setPhoneNumber(value.phoneNumber.trim());
            setNotice("Verification code sent.");
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
      setNotice(null);

      const { error: verifyError } = await authClient.phoneNumber.verify({
        phoneNumber,
        code: value.otp.trim(),
      });

      if (verifyError) {
        setError(verifyError.message ?? "Invalid verification code");
        return;
      }

      formApi.reset();
      queryClient.refetchQueries();
      router.replace("/(app)");
    },
  });

  if (step === "otp") {
    return (
      <FormScreenShell>
        <View style={styles.header}>
          <Text accessibilityRole="header" style={styles.title}>
            Enter your code
          </Text>
          <Text style={styles.subtitle}>
            We sent a verification code to {phoneNumber}.
          </Text>
        </View>

        <otpForm.Subscribe
          selector={(state) => ({
            canSubmit: state.canSubmit,
            isSubmitting: state.isSubmitting,
          })}
        >
          {({ canSubmit, isSubmitting }) => (
            <>
              <Banner message={notice} tone="success" />
              <Banner message={error} tone="error" />

              <otpForm.Field name="otp">
                {(field) => (
                  <TextField
                    autoComplete="off"
                    errorText={field.state.meta.errors?.[0]?.message ?? null}
                    helperText="4–8 digits"
                    icon="keypad-outline"
                    keyboardType="number-pad"
                    label="Verification code"
                    onBlur={field.handleBlur}
                    onChangeText={(next) => {
                      field.handleChange(next);
                      setError(null);
                    }}
                    placeholder="000000"
                    returnKeyType="done"
                    testID="otp-code"
                    value={field.state.value}
                  />
                )}
              </otpForm.Field>

              <Button
                accessibilityHint="Verifies the code and signs you in"
                disabled={!canSubmit}
                loading={isSubmitting}
                onPress={otpForm.handleSubmit}
              >
                Verify & sign in
              </Button>

              <Button
                accessibilityHint="Returns to the phone number step"
                onPress={() => {
                  setStep("phone");
                  setError(null);
                  setNotice(null);
                }}
                variant="ghost"
              >
                Use a different number
              </Button>
            </>
          )}
        </otpForm.Subscribe>
      </FormScreenShell>
    );
  }

  return (
    <FormScreenShell>
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.title}>
          Sign in with phone
        </Text>
        <Text style={styles.subtitle}>
          No password needed — we text you a one-time code.
        </Text>
      </View>

      <phoneForm.Subscribe
        selector={(state) => ({
          canSubmit: state.canSubmit,
          isSubmitting: state.isSubmitting,
        })}
      >
        {({ canSubmit, isSubmitting }) => (
          <>
            <Banner message={error} tone="error" />

            <phoneForm.Field name="phoneNumber">
              {(field) => (
                <TextField
                  autoComplete="tel"
                  errorText={field.state.meta.errors?.[0]?.message ?? null}
                  icon="call-outline"
                  keyboardType="phone-pad"
                  label="Phone number"
                  onBlur={field.handleBlur}
                  onChangeText={(next) => {
                    field.handleChange(next);
                    setError(null);
                  }}
                  placeholder="+8801712345678"
                  returnKeyType="done"
                  testID="phone-number"
                  textContentType="telephoneNumber"
                  value={field.state.value}
                />
              )}
            </phoneForm.Field>

            <Button
              accessibilityHint="Texts you a verification code"
              disabled={!canSubmit}
              loading={isSubmitting}
              onPress={phoneForm.handleSubmit}
            >
              Send verification code
            </Button>
          </>
        )}
      </phoneForm.Subscribe>

      <Button
        accessibilityHint="Goes to the email and password sign-in screen"
        onPress={() => router.push("/(auth)/login")}
        variant="ghost"
      >
        Use email instead
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
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  bannerError: {
    backgroundColor: theme.colors.destructiveSurface,
  },
  bannerSuccess: {
    backgroundColor: theme.colors.infoSurface,
  },
  bannerIcon: {
    flexShrink: 0,
  },
  bannerErrorText: {
    flex: 1,
    fontFamily: theme.fontFamily.caption,
    fontSize: theme.fontSize.sm,
    color: theme.colors.destructive,
  },
  bannerSuccessText: {
    flex: 1,
    fontFamily: theme.fontFamily.caption,
    fontSize: theme.fontSize.sm,
    color: theme.colors.foreground,
  },
}));
