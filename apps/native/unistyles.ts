import { StyleSheet } from "react-native-unistyles";

import { breakpoints } from "./breakpoints";
import { darkTheme, lightTheme } from "./theme";

type AppBreakpoints = typeof breakpoints;

interface AppThemes {
  dark: typeof darkTheme;
  light: typeof lightTheme;
}

declare module "react-native-unistyles" {
  export interface UnistylesBreakpoints extends AppBreakpoints {}
  export interface UnistylesThemes extends AppThemes {}
}

StyleSheet.configure({
  breakpoints,
  themes: {
    light: lightTheme,
    dark: darkTheme,
  },
  settings: {
    adaptiveThemes: true,
  },
});
