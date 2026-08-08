import { Stack } from "expo-router";
import { useUnistyles } from "react-native-unistyles";

const AppLayout = () => {
  const { theme } = useUnistyles();

  return (
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
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="settings" options={{ headerTitle: "Settings" }} />
      <Stack.Screen
        name="ticket"
        options={{ headerTitle: "Support Tickets" }}
      />
      <Stack.Screen
        name="subscription"
        options={{ headerTitle: "Subscription" }}
      />
    </Stack>
  );
};

export default AppLayout;
