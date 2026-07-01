import "@/polyfills";
import { TokenRefreshProvider } from "@community/ui/components/token-refresh-provider";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useUnistyles } from "react-native-unistyles";
import { CallStateRestoreGuard } from "@/components/call-state-restore-guard";
import { ErrorBoundary } from "@/components/error-boundary";
import { SessionRestoreGuard } from "@/components/session-restore-guard";
import { authClient } from "@/lib/auth-client";
import { reportCrash } from "@/utils/crash-reporter";
import { queryClient } from "@/utils/orpc";

export const unstable_settings = {
  initialRouteName: "(drawer)",
};

const BACKGROUND_STATE_REGEX = /inactive|background/;

export default function RootLayout() {
  const { theme } = useUnistyles();
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      (nextState: AppStateStatus) => {
        const prevState = appState.current;
        appState.current = nextState;

        // Detect foreground transition: if the app was backgrounded/inactive
        // and is now active, check whether the call state is stale.
        // A stale call while coming to foreground = the app was killed
        // while backgrounded (force_close).
        if (BACKGROUND_STATE_REGEX.test(prevState) && nextState === "active") {
          import("@/utils/call-state-storage").then(
            ({ getCallState, isStateStale }) => {
              getCallState().then((state) => {
                if (state && isStateStale(state)) {
                  reportCrash("force_close", "App killed while in background");
                }
              });
            }
          );
        }
      }
    );

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <TokenRefreshProvider authClient={authClient}>
            <SessionRestoreGuard>
              <CallStateRestoreGuard>
                <Stack
                  screenOptions={{
                    headerStyle: {
                      backgroundColor: theme.colors.background,
                    },
                    headerTitleStyle: {
                      color: theme.colors.foreground,
                    },
                    headerTintColor: theme.colors.foreground,
                  }}
                >
                  <Stack.Screen
                    name="(drawer)"
                    options={{ headerShown: false }}
                  />
                  <Stack.Screen
                    name="call/[room]"
                    options={{ title: "Call", headerShown: true }}
                  />
                  <Stack.Screen
                    name="modal"
                    options={{ title: "Modal", presentation: "modal" }}
                  />
                </Stack>
              </CallStateRestoreGuard>
            </SessionRestoreGuard>
          </TokenRefreshProvider>
        </GestureHandlerRootView>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}
