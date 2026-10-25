const path = require("node:path");
const expoPreset = require("jest-expo/jest-preset");

const rnDir = path.dirname(
  require.resolve("react-native/package.json", {
    // biome-ignore lint/correctness/noGlobalDirnameFilename: CommonJS config requires __dirname
    paths: [__dirname],
  })
);

/** @type {import('jest').Config} */
module.exports = {
  ...expoPreset,
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  moduleNameMapper: {
    "^react-native/react-private-interface$": path.join(
      rnDir,
      "src/react-private-interface.js"
    ),
    "^react-native/setup-env$": "<rootDir>/jest.setup-env.js",
    ...(expoPreset.moduleNameMapper ?? {}),
  },
  // Ships with react-native-worklets: resolves its web (`*.ts`) modules instead
  // of the `.native` ones that require a live TurboModule at import time.
  resolver: "react-native-worklets/jest/resolver.js",
  setupFiles: [
    ...(expoPreset.setupFiles ?? []),
    "<rootDir>/jest.polyfill.ts",
    "react-native-unistyles/mocks",
  ],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
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
