const expoPreset = require("jest-expo/jest-preset");

/** @type {import('jest').Config} */
module.exports = {
  ...expoPreset,
  // Ships with react-native-worklets: resolves its web (`*.ts`) modules instead
  // of the `.native` ones that require a live TurboModule at import time.
  resolver: "react-native-worklets/jest/resolver.js",
  setupFiles: [
    ...(expoPreset.setupFiles ?? []),
    "react-native-unistyles/mocks",
  ],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  testMatch: [
    "<rootDir>/__tests__/**/*.test.ts",
    "<rootDir>/__tests__/**/*.test.tsx",
  ],
  transformIgnorePatterns: [
    "/node_modules/(?!(.pnpm|react-native|@react-native|@react-native-community|expo[-/]|@expo/|@expo-google-fonts|react-navigation|@react-navigation|react-native-reanimated|react-native-worklets|react-native-unistyles|@community/))",
    "/node_modules/react-native-reanimated/plugin/",
    "/node_modules/@react-native/babel-preset/",
  ],
};
