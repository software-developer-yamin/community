import "@/polyfills";
import { TokenRefreshProvider } from "@community/ui/components/token-refresh-provider";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useUnistyles } from "react-native-unistyles";

import { authClient } from "@/lib/auth-client";

import { queryClient } from "@/utils/orpc";

export const unstable_settings = {
  initialRouteName: "(drawer)",
};

export default function RootLayout() {
  const { theme } = useUnistyles();

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <TokenRefreshProvider authClient={authClient}><Stack
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
          <Stack.Screen name="(drawer)" options={{ headerShown: false }} />
          <Stack.Screen
            name="call/[room]"
            options={{ title: "Call", headerShown: true }}
          />
          <Stack.Screen
            name="modal"
            options={{ title: "Modal", presentation: "modal" }}
          />
        </Stack></TokenRefreshProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
