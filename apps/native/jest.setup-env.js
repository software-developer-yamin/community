// In Jest, environment setup is handled by @react-native/jest-preset and jest-expo.
// Loading the real native setup-env.js invokes C++ TurboModules (like NativePerformanceCxx)
// which do not exist in the Node test environment.
module.exports = {};
