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
  { icon: "home-outline", iconActive: "home", name: "home", title: "Home" },
  {
    icon: "school-outline",
    iconActive: "school",
    name: "classes",
    title: "Classes",
  },
  { icon: "mic-outline", iconActive: "mic", name: "rooms", title: "Rooms" },
  {
    icon: "book-outline",
    iconActive: "book",
    name: "learning",
    title: "Learning",
  },
  {
    icon: "person-circle-outline",
    iconActive: "person-circle",
    name: "my-view",
    title: "My View",
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
        tabBarItemStyle: {
          borderRadius: theme.borderRadius.full,
        },
        tabBarLabelStyle: {
          fontFamily: theme.fontFamily.caption,
          fontSize: 11,
        },
        tabBarStyle: {
          backgroundColor: theme.colors.card,
          borderRadius: theme.borderRadius.full,
          borderTopWidth: 0,
          bottom: theme.spacing.lg,
          height: 68,
          left: theme.spacing.lg,
          paddingBottom: theme.spacing.sm,
          paddingTop: theme.spacing.sm,
          position: "absolute",
          right: theme.spacing.lg,
          ...theme.shadow.tabBar,
        },
      }}
    >
      {TABS.map(({ name, title, icon, iconActive }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                color={typeof color === "string" ? color : undefined}
                name={focused ? iconActive : icon}
                size={TAB_ICON_SIZE}
              />
            ),
            title,
          }}
        />
      ))}
      <Tabs.Screen name="ai" options={{ href: null }} />
      <Tabs.Screen name="progress" options={{ href: null }} />
      <Tabs.Screen name="recommendations" options={{ href: null }} />
    </Tabs>
  );
}
