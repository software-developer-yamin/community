/**
 * Bun test preload: mock native Expo modules before any test file imports them.
 *
 * Usage (run from apps/native/):
 *   bun test --preload ./utils/test-setup.ts utils/
 *
 * Exports mutable state objects so individual test files can clear/override
 * between tests via beforeEach without needing their own mock.module() calls.
 */
import { mock } from "bun:test";

// ---------------------------------------------------------------------------
// expo-secure-store — shared mutable in-memory store
// Export so test files can clear between tests via beforeEach.
// ---------------------------------------------------------------------------
export const secureStore: Record<string, string> = {};

mock.module("expo-secure-store", () => ({
  getItemAsync: (key: string) => Promise.resolve(secureStore[key] ?? null),
  setItemAsync: (key: string, value: string) => {
    secureStore[key] = value;
    return Promise.resolve();
  },
  deleteItemAsync: (key: string) => {
    delete secureStore[key];
    return Promise.resolve();
  },
}));

// ---------------------------------------------------------------------------
// expo-network — mutable factory so tests can swap the implementation
// Export `networkMock` so tests can override `getNetworkStateAsync` per test.
// ---------------------------------------------------------------------------
export const networkMock = {
  getNetworkStateAsync: async (): Promise<{ isConnected: boolean | null }> => ({
    isConnected: true,
  }),
};

mock.module("expo-network", () => ({
  getNetworkStateAsync: () => networkMock.getNetworkStateAsync(),
}));
