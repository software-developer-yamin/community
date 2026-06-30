import { useMutation } from "@tanstack/react-query";
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

import { orpc, queryClient } from "@/utils/orpc";

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

interface AccountRecoveryProps {
  onComplete: () => void;
}

export function AccountRecovery({ onComplete }: AccountRecoveryProps) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const linkAccount = useMutation(
    orpc.rebuild.linkAccount.mutationOptions({
      onSuccess(data) {
        if (data.linked) {
          setSuccess("Account restored!");
          setError(null);
          queryClient.invalidateQueries();
          onComplete();
        } else {
          // same_account — no-op, dismiss
          onComplete();
        }
      },
      onError(err) {
        const message =
          err instanceof Error ? err.message : "Failed to recover account";
        setError(message);
      },
    })
  );

  const handleSubmit = () => {
    setError(null);
    setValidationError(null);

    const result = phoneSchema.safeParse({ phoneNumber });
    if (!result.success) {
      const firstMessage = result.error.errors[0]?.message;
      setValidationError(firstMessage ?? "Invalid phone number");
      return;
    }

    linkAccount.mutate({ phoneNumber: result.data.phoneNumber });
  };

  const displayError = error ?? validationError;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Account Recovery</Text>
      <Text style={styles.description}>
        Were you previously signed in with your phone number? Enter your phone
        number to restore your account data.
      </Text>

      {success ? (
        <View style={styles.successContainer}>
          <Text style={styles.successText}>{success}</Text>
        </View>
      ) : null}

      {displayError ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{displayError}</Text>
        </View>
      ) : null}

      <TextInput
        keyboardType="phone-pad"
        onChangeText={(value) => {
          setPhoneNumber(value);
          if (error) {
            setError(null);
          }
          if (validationError) {
            setValidationError(null);
          }
        }}
        placeholder="Phone number (e.g., +8801712345678)"
        style={styles.input}
        value={phoneNumber}
      />

      <TouchableOpacity
        disabled={linkAccount.isPending}
        onPress={handleSubmit}
        style={styles.button}
      >
        {linkAccount.isPending ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.buttonText}>Recover my account</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={onComplete} style={styles.skipButton}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>
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
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: theme.colors.typography,
    marginBottom: 16,
    lineHeight: 20,
  },
  successContainer: {
    marginBottom: 16,
    padding: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.success ?? "#d4edda",
  },
  successText: {
    color: theme.colors.successForeground,
    fontSize: 14,
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
  button: {
    backgroundColor: theme.colors.primary,
    padding: 16,
    borderRadius: 6,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  buttonText: {
    fontWeight: "500",
  },
  skipButton: {
    padding: 8,
    alignItems: "center",
  },
  skipText: {
    color: theme.colors.primary,
    fontSize: 14,
  },
}));
