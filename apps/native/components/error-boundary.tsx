/**
 * ErrorBoundary
 *
 * Class-based React ErrorBoundary that catches unhandled render errors
 * and shows a fallback UI instead of a frozen component tree.
 *
 * On error:
 *   1. Reports the crash via `reportCrash("runtime_error", ...)`
 *   2. Clears persisted call state to prevent stale recovery
 *   3. Renders a "Something went wrong" fallback with a "Return home" button
 *
 * Addresses: story 6.2 AC-1, T1.1
 */

import { router } from "expo-router";
import type { ReactNode } from "react";
import { Component } from "react";
import { Pressable, Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { clearCallState } from "@/utils/call-state-storage";
import { reportCrash } from "@/utils/crash-reporter";

// ---------------------------------------------------------------------------
// Props & State
// ---------------------------------------------------------------------------

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    // Report crash metadata (best-effort, never throws)
    reportCrash("runtime_error", error.message ?? "Unknown render error");

    // Clear call state so the next launch doesn't try to restore a broken call
    clearCallState();
  }

  handleReturnHome = () => {
    this.setState({ hasError: false }, () => {
      router.replace("/");
    });
  };

  render() {
    if (this.state.hasError) {
      return <FallbackUI onReturnHome={this.handleReturnHome} />;
    }

    return this.props.children;
  }
}

// ---------------------------------------------------------------------------
// Fallback UI
// ---------------------------------------------------------------------------

function FallbackUI({ onReturnHome }: { onReturnHome: () => void }) {
  return (
    <View style={styles.root}>
      <Text style={styles.title}>Something went wrong</Text>
      <Text style={styles.subtitle}>
        An unexpected error occurred. Please return to the home screen.
      </Text>
      <Pressable
        nativeID="error-boundary-return-home"
        onPress={onReturnHome}
        style={styles.button}
      >
        <Text style={styles.buttonText}>Return home</Text>
      </Pressable>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create((theme) => ({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: theme.colors.background,
    gap: 16,
  },
  title: {
    fontSize: theme.fontSize["2xl"],
    fontWeight: "700",
    color: theme.colors.foreground,
    textAlign: "center",
  },
  subtitle: {
    fontSize: theme.fontSize.base,
    color: theme.colors.mutedForeground,
    textAlign: "center",
  },
  button: {
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    fontSize: theme.fontSize.base,
    fontWeight: "600",
    color: theme.colors.primaryForeground,
  },
}));
