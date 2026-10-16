import "@testing-library/react-native";
import type { ReactNode } from "react";

jest.mock("react-native-reanimated", () =>
  require("react-native-reanimated/mock")
);

// Ordering dependency: unistyles' mock is registered in jest.config.js
// `setupFiles`, so this must import after it for `useUnistyles().theme` to
// resolve to the app's real `lightTheme`.
import "./unistyles";
import { setUpTests } from "react-native-reanimated";

setUpTests();

jest.mock("@community/env/native", () => ({
  env: {
    EXPO_PUBLIC_SERVER_URL: "http://localhost:3000",
  },
}));

jest.mock("@/utils/orpc", () => ({
  orpc: {
    recommendations: {
      getRecommendations: {
        queryOptions: jest.fn().mockReturnValue({}),
      },
      trackInteraction: {
        mutationOptions: jest.fn().mockReturnValue({}),
      },
    },
    rebuild: {
      getSubscription: {
        queryOptions: jest.fn().mockReturnValue({}),
      },
      getMyTickets: {
        queryOptions: jest.fn().mockReturnValue({}),
      },
      getTicketMessages: {
        queryOptions: jest.fn().mockReturnValue({}),
      },
    },
  },
  queryClient: {},
}));

// expo-constants warns "no native ExponentConstants module found" on import
// under Node. It has no usable runtime there, so stub the constant surface.
jest.mock("expo-constants", () => ({
  Constants: { executionEnvironment: "standalone", expoConfig: null },
  ExecutionEnvironment: {
    Standalone: "standalone",
    StoreClient: "storeClient",
  },
}));

jest.mock("expo-linear-gradient", () => {
  const { createElement } = require("react");
  const { View } = require("react-native");
  return {
    LinearGradient: ({
      children,
      style,
      ...rest
    }: {
      children?: ReactNode;
      style?: unknown;
      [key: string]: unknown;
    }) => createElement(View, { style, ...rest }, children),
  };
});

// Mock contract: `Tabs` renders children; each `Tabs.Screen` renders a marker
// `View` with testID `tab:<name>` and accessibilityLabel = configured title, and
// renders nothing when `href` is null (mirroring how the real router hides a
// route from the tab bar). Lets tests assert nav config without the real router.
jest.mock("expo-router", () => {
  const { createElement } = require("react");
  const { View } = require("react-native");

  const Tabs = ({ children }: { children: ReactNode }) =>
    createElement(View, { testID: "tabs-root" }, children);

  Tabs.Screen = ({
    name,
    options,
  }: {
    name: string;
    options?: { title?: string; href?: string | null };
  }) =>
    options?.href === null
      ? null
      : createElement(View, {
          accessibilityLabel: options?.title,
          testID: `tab:${name}`,
        });

  const Stack = ({ children }: { children: ReactNode }) =>
    createElement(View, { testID: "stack-root" }, children);
  Stack.Screen = () => null;

  const Redirect = ({ href }: { href: string }) =>
    createElement(View, { testID: `redirect:${href}` });

  return {
    Redirect,
    Stack,
    Tabs,
    useLocalSearchParams: () => ({}),
    useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  };
});
