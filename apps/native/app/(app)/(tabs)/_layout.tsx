import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import type { ComponentProps } from "react";
import { useUnistyles } from "react-native-unistyles";

type IoniconName = ComponentProps<typeof Ionicons>["name"];

const TAB_ICON_SIZE = 24;

const TABS: {
  name: string;
  title: string;
  icon: IoniconName;
  iconActive: IoniconName;
}[] = [
  { name: "home", title: "Home", icon: "home-outline", iconActive: "home" },
  {
    name: "classes",
    title: "Classes",
    icon: "school-outline",
    iconActive: "school",
  },
  { name: "rooms", title: "Rooms", icon: "mic-outline", iconActive: "mic" },
  {
    name: "learning",
    title: "Learning",
    icon: "book-outline",
    iconActive: "book",
  },
  {
    name: "my-view",
    title: "My View",
    icon: "person-circle-outline",
    iconActive: "person-circle",
  },
];

export default function TabLayout() {
  const { theme } = useUnistyles();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.mutedForeground,
        tabBarLabelStyle: {
          fontFamily: theme.fontFamily.caption,
          fontSize: 11,
        },
        tabBarStyle: {
          position: "absolute",
          left: theme.spacing.lg,
          right: theme.spacing.lg,
          bottom: theme.spacing.lg,
          height: 68,
          borderRadius: theme.borderRadius.full,
          backgroundColor: theme.colors.card,
          borderTopWidth: 0,
          paddingTop: theme.spacing.sm,
          paddingBottom: theme.spacing.sm,
          ...theme.shadow.tabBar,
        },
        tabBarItemStyle: {
          borderRadius: theme.borderRadius.full,
        },
      }}
    >
      {TABS.map(({ name, title, icon, iconActive }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                color={color}
                name={focused ? iconActive : icon}
                size={TAB_ICON_SIZE}
              />
            ),
          }}
        />
      ))}
      <Tabs.Screen name="ai" options={{ href: null }} />
      <Tabs.Screen name="progress" options={{ href: null }} />
      <Tabs.Screen name="recommendations" options={{ href: null }} />
    </Tabs>
  );
}
