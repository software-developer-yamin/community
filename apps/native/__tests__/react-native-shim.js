// Expo-compatible react-native shim for bun test (avoids Flow-type parsing errors)
const noop = () => undefined;

module.exports = {
  Platform: { OS: "android", Version: 34, select: (s) => s.android ?? "" },
  NativeModules: {},
  TurboModuleRegistry: {
    get: () => null,
    getEnforcing: () => null,
  },
  DeviceEventEmitter: { addListener: () => ({ remove: noop }) },
  NativeEventEmitter: class {
    addListener = () => ({ remove: noop });
    removeAllListeners = noop;
  },
  AppRegistry: { registerComponent: noop },
  StyleSheet: { create: (s) => s, hairlineWidth: () => 1 },
  PixelRatio: { get: () => 2, getFontScale: () => 1 },
  Dimensions: { get: () => ({ width: 390, height: 844 }) },
  I18nManager: { isRTL: false },
  YellowBox: { ignoreWarnings: noop },
  LogBox: { ignoreLogs: noop },
};
