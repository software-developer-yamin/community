import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { Drawer } from "expo-router/drawer";
import { useUnistyles } from "react-native-unistyles";

import { HeaderButton } from "../../components/header-button";

const DrawerLayout = () => {
  const { theme } = useUnistyles();

  return (
    <Drawer
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.background,
        },
        headerTitleStyle: {
          color: theme.colors.foreground,
        },
        headerTintColor: theme.colors.foreground,
        drawerStyle: {
          backgroundColor: theme.colors.background,
        },
        drawerLabelStyle: {
          color: theme.colors.foreground,
        },
        drawerInactiveTintColor: theme.colors.mutedForeground,
      }}
    >
      <Drawer.Screen
        name="index"
        options={{
          headerTitle: "Home",
          drawerLabel: "Home",
          drawerIcon: ({ size, color }) => (
            <Ionicons color={color} name="home-outline" size={size} />
          ),
        }}
      />
      <Drawer.Screen
        name="(tabs)"
        options={{
          headerTitle: "Practice",
          drawerLabel: "Practice",
          drawerIcon: ({ size, color }) => (
            <Ionicons color={color} name="apps-outline" size={size} />
          ),
          headerRight: () => (
            <Link asChild href="/modal">
              <HeaderButton />
            </Link>
          ),
        }}
      />
      <Drawer.Screen
        name="rooms"
        options={{
          headerTitle: "Voice Clubs",
          drawerLabel: "Voice Clubs",
          drawerIcon: ({ size, color }) => (
            <Ionicons color={color} name="people-outline" size={size} />
          ),
        }}
      />
      <Drawer.Screen
        name="ai"
        options={{
          headerTitle: "AI",
          drawerLabel: "AI",
          drawerIcon: ({ size, color }) => (
            <Ionicons
              color={color}
              name="chatbubble-ellipses-outline"
              size={size}
            />
          ),
        }}
      />
      <Drawer.Screen
        name="settings"
        options={{
          headerTitle: "Settings",
          drawerLabel: "Settings",
          drawerIcon: ({ size, color }) => (
            <Ionicons color={color} name="settings-outline" size={size} />
          ),
        }}
      />
      <Drawer.Screen
        name="ticket"
        options={{
          headerTitle: "Support Tickets",
          drawerLabel: "Support",
          drawerIcon: ({ size, color }) => (
            <Ionicons color={color} name="help-buoy-outline" size={size} />
          ),
        }}
      />
    </Drawer>
  );
};

export default DrawerLayout;
