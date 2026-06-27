/**
 * Unit tests for network-state.ts
 *
 * Test IDs from test-design-epic-6.md:
 *   6.1-UNIT-007 (P0), 6.1-UNIT-008 (P0), 6.1-UNIT-011 (P1)
 *
 * Run from apps/native/:
 *   bun test --preload ./utils/test-setup.ts utils/network-state.test.ts
 */

import { afterEach, describe, expect, test } from "bun:test";
import { checkNetworkAvailable, isOfflineError } from "./network-state";
// Import the shared network mock from preload so tests can override per-test.
import { networkMock } from "./test-setup";

// Default factory restored after each test
const defaultFactory = networkMock.getNetworkStateAsync;
afterEach(() => {
  networkMock.getNetworkStateAsync = defaultFactory;
});

// ---------------------------------------------------------------------------
// checkNetworkAvailable
// ---------------------------------------------------------------------------
describe("checkNetworkAvailable", () => {
  // -------------------------------------------------------------------------
  // 6.1-UNIT-007: falls back to true on exception
  // -------------------------------------------------------------------------
  test("6.1-UNIT-007: returns true when getNetworkStateAsync throws", async () => {
    networkMock.getNetworkStateAsync = () => {
      throw new Error("network sensor unavailable");
    };
    expect(await checkNetworkAvailable()).toBe(true);
  });

  test("returns true when isConnected is true", async () => {
    networkMock.getNetworkStateAsync = async () => ({ isConnected: true });
    expect(await checkNetworkAvailable()).toBe(true);
  });

  test("returns false when isConnected is false", async () => {
    networkMock.getNetworkStateAsync = async () => ({ isConnected: false });
    expect(await checkNetworkAvailable()).toBe(false);
  });

  test("falls back to true when isConnected is null", async () => {
    networkMock.getNetworkStateAsync = async () => ({ isConnected: null });
    expect(await checkNetworkAvailable()).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// isOfflineError
// ---------------------------------------------------------------------------
describe("isOfflineError", () => {
  // -------------------------------------------------------------------------
  // 6.1-UNIT-008: classifies TypeError messages correctly (P0)
  // -------------------------------------------------------------------------
  test("6.1-UNIT-008: returns true for TypeError with 'network error'", () => {
    expect(isOfflineError(new TypeError("network error"))).toBe(true);
  });

  test("6.1-UNIT-008: returns true for TypeError with 'dns' message", () => {
    expect(isOfflineError(new TypeError("dns lookup failed"))).toBe(true);
  });

  test("6.1-UNIT-008: returns true for TypeError with 'fetch failed'", () => {
    expect(isOfflineError(new TypeError("fetch failed"))).toBe(true);
  });

  test("6.1-UNIT-008: returns true for TypeError with 'offline'", () => {
    expect(isOfflineError(new TypeError("you are offline"))).toBe(true);
  });

  test("6.1-UNIT-008: returns true for TypeError with 'econnrefused'", () => {
    expect(isOfflineError(new TypeError("ECONNREFUSED 127.0.0.1:3000"))).toBe(
      true
    );
  });

  test("6.1-UNIT-008: returns true for TypeError with 'enotfound'", () => {
    expect(isOfflineError(new TypeError("ENOTFOUND api.example.com"))).toBe(
      true
    );
  });

  test("6.1-UNIT-008: returns false for TypeError with '500' (server error)", () => {
    expect(isOfflineError(new TypeError("500 Internal Server Error"))).toBe(
      false
    );
  });

  // -------------------------------------------------------------------------
  // 6.1-UNIT-011 (P1): ignores non-TypeError errors
  // -------------------------------------------------------------------------
  test("6.1-UNIT-011: returns false for generic Error", () => {
    expect(isOfflineError(new Error("Internal Server Error"))).toBe(false);
  });

  test("6.1-UNIT-011: returns false for string error", () => {
    expect(isOfflineError("network error")).toBe(false);
  });

  test("6.1-UNIT-011: returns false for null", () => {
    expect(isOfflineError(null)).toBe(false);
  });

  test("6.1-UNIT-011: returns false for plain object", () => {
    expect(isOfflineError({ message: "network error" })).toBe(false);
  });
});
