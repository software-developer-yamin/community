import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps, ReactNode } from "react";
import { useState } from "react";
import { Text, TextInput, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

type IoniconName = ComponentProps<typeof Ionicons>["name"];

export interface TextFieldProps {
  autoCapitalize?: "none" | "sentences" | "words";
  autoComplete?: "name" | "email" | "password" | "tel" | "off";
  editable?: boolean;
  errorText?: string | null;
  helperText?: string;
  icon?: IoniconName;
  keyboardType?: "default" | "email-address" | "phone-pad" | "number-pad";
  label: string;
  onBlur?: () => void;
  onChangeText: (value: string) => void;
  placeholder?: string;
  returnKeyType?: "next" | "done" | "send";
  secureTextEntry?: boolean;
  testID?: string;
  textContentType?: "name" | "emailAddress" | "password" | "telephoneNumber";
  value: string;
}

function Footnote({
  errorText,
  helperText,
}: Pick<TextFieldProps, "errorText" | "helperText">): ReactNode {
  if (errorText) {
    return (
      <Text accessibilityRole="alert" style={styles.error}>
        {errorText}
      </Text>
    );
  }

  if (helperText) {
    return <Text style={styles.helper}>{helperText}</Text>;
  }

  return null;
}

/** Themed labelled input with helper/error line. Auth and onboarding forms use this instead of raw TextInput. */
export function TextField({
  label,
  value,
  onChangeText,
  onBlur,
  placeholder,
  helperText,
  errorText,
  icon,
  secureTextEntry = false,
  keyboardType = "default",
  autoCapitalize = "none",
  autoComplete = "off",
  textContentType,
  editable = true,
  returnKeyType,
  testID,
}: TextFieldProps) {
  const [isFocused, setIsFocused] = useState(false);
  const hasError = Boolean(errorText);

  function resolveBorderStyle() {
    if (hasError) {
      return styles.borderError;
    }
    if (isFocused) {
      return styles.borderFocused;
    }
    return styles.borderIdle;
  }

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputRow, resolveBorderStyle()]}>
        {icon ? (
          <Ionicons
            color={hasError ? "#E23D42" : "#6B6478"}
            name={icon}
            size={18}
          />
        ) : null}
        <TextInput
          accessibilityLabel={label}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          editable={editable}
          keyboardType={keyboardType}
          onBlur={() => {
            setIsFocused(false);
            onBlur?.();
          }}
          onChangeText={onChangeText}
          onFocus={() => setIsFocused(true)}
          placeholder={placeholder}
          placeholderTextColor="#A79FBD"
          returnKeyType={returnKeyType}
          secureTextEntry={secureTextEntry}
          style={styles.input}
          testID={testID}
          textContentType={textContentType}
          value={value}
        />
      </View>
      <Footnote errorText={errorText} helperText={helperText} />
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  field: {
    gap: theme.spacing.xs,
  },
  label: {
    fontFamily: theme.fontFamily.label,
    fontSize: theme.fontSize.sm,
    color: theme.colors.foreground,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    height: 56,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.card,
    borderWidth: 1.5,
  },
  borderIdle: {
    borderColor: theme.colors.border,
  },
  borderFocused: {
    borderColor: theme.colors.primary,
  },
  borderError: {
    borderColor: theme.colors.destructive,
  },
  input: {
    flex: 1,
    fontFamily: theme.fontFamily.body,
    fontSize: theme.fontSize.base,
    color: theme.colors.foreground,
  },
  helper: {
    fontFamily: theme.fontFamily.caption,
    fontSize: theme.fontSize.xs,
    color: theme.colors.mutedForeground,
  },
  error: {
    fontFamily: theme.fontFamily.caption,
    fontSize: theme.fontSize.xs,
    color: theme.colors.destructive,
  },
}));
