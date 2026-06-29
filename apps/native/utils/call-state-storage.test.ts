/**
 * Unit tests for call-state-storage.ts
 *
 * Test IDs from test-design-epic-6.md:
 *   6.1-UNIT-001 through 006 (P0), 009 (P0), 010 (P1)
 *
 * Run from apps/native/:
 *   bun test --preload ./utils/test-setup.ts utils/call-state-storage.test.ts
 */

import { beforeEach, describe, expect, test } from "bun:test";
import type { SavedCallState } from "./call-state-storage";
import {
  CALL_STATE_KEY,
  clearCallState,
  getCallState,
  isStateStale,
  saveCallState,
} from "./call-state-storage";
// Import the shared mutable store from the preload — same object reference
// used by the expo-secure-store mock closures, so clearing it here affects
// all calls to saveCallState / getCallState / clearCallState.
import { secureStore } from "./test-setup";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const THIRTY_MIN_MS = 30 * 60 * 1000;

function makeState(overrides: Partial<SavedCallState> = {}): SavedCallState {
  return {
    roomName: "test-room",
    timestamp: Date.now(),
    token: "test-token",
    userId: "user-001",
    ...overrides,
  };
}

function clearStore(): void {
  for (const key of Object.keys(secureStore)) {
    delete secureStore[key];
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("callStateStorage", () => {
  beforeEach(clearStore);

  // -------------------------------------------------------------------------
  // 6.1-UNIT-001: saveCallState persists JSON with correct fields
  // -------------------------------------------------------------------------
  test("6.1-UNIT-001: saveCallState persists JSON with correct fields", async () => {
    const state = makeState();
    await saveCallState(state);
    const retrieved = await getCallState();
    expect(retrieved).not.toBeNull();
    expect(retrieved?.roomName).toBe(state.roomName);
    expect(retrieved?.token).toBe(state.token);
    expect(retrieved?.userId).toBe(state.userId);
    expect(typeof retrieved?.timestamp).toBe("number");
  });

  // -------------------------------------------------------------------------
  // 6.1-UNIT-002: getCallState returns null on empty store
  // -------------------------------------------------------------------------
  test("6.1-UNIT-002: getCallState returns null on empty store", async () => {
    const result = await getCallState();
    expect(result).toBeNull();
  });

  // -------------------------------------------------------------------------
  // 6.1-UNIT-003: isStateStale returns false within 30-min TTL
  // -------------------------------------------------------------------------
  test("6.1-UNIT-003: isStateStale returns false for 29-min-old state", () => {
    const twentyNineMinAgo = Date.now() - 29 * 60 * 1000;
    const state = makeState({ timestamp: twentyNineMinAgo });
    expect(isStateStale(state, THIRTY_MIN_MS)).toBe(false);
  });

  // -------------------------------------------------------------------------
  // 6.1-UNIT-004: isStateStale returns true after 30 min
  // -------------------------------------------------------------------------
  test("6.1-UNIT-004: isStateStale returns true for 31-min-old state", () => {
    const thirtyOneMinAgo = Date.now() - 31 * 60 * 1000;
    const state = makeState({ timestamp: thirtyOneMinAgo });
    expect(isStateStale(state, THIRTY_MIN_MS)).toBe(true);
  });

  // -------------------------------------------------------------------------
  // 6.1-UNIT-005: clearCallState removes persisted state
  // -------------------------------------------------------------------------
  test("6.1-UNIT-005: clearCallState removes persisted state", async () => {
    await saveCallState(makeState());
    expect(await getCallState()).not.toBeNull();
    await clearCallState();
    expect(await getCallState()).toBeNull();
  });

  // -------------------------------------------------------------------------
  // 6.1-UNIT-006: corrupt JSON gracefully returns null (no throw)
  // -------------------------------------------------------------------------
  test("6.1-UNIT-006: corrupt JSON returns null without throwing", async () => {
    // Write non-JSON directly into the in-memory store using the exported key constant
    // so this test stays correct if CALL_STATE_KEY is ever renamed.
    secureStore[CALL_STATE_KEY] = "not-valid-json!!!";
    const result = await getCallState();
    expect(result).toBeNull();
  });

  // -------------------------------------------------------------------------
  // 6.1-UNIT-009: clearCallState on logout prevents cross-user state leak
  // -------------------------------------------------------------------------
  test("6.1-UNIT-009: clearCallState on logout prevents cross-user state leak", async () => {
    await saveCallState(makeState({ userId: "user-A" }));
    // Simulate logout: clear state
    await clearCallState();
    // User B logs in — must not see User A's state
    expect(await getCallState()).toBeNull();
  });

  // -------------------------------------------------------------------------
  // 6.1-UNIT-010 (P1): saveCallState overwrites existing state atomically
  // -------------------------------------------------------------------------
  test("6.1-UNIT-010: saveCallState overwrites existing state atomically", async () => {
    const stateA = makeState({ roomName: "room-A", userId: "user-A" });
    const stateB = makeState({ roomName: "room-B", userId: "user-B" });

    await saveCallState(stateA);
    await saveCallState(stateB);

    const retrieved = await getCallState();
    expect(retrieved?.roomName).toBe("room-B");
    expect(retrieved?.userId).toBe("user-B");
  });

  // -------------------------------------------------------------------------
  // R-007-GUARD: default TTL constant verification (extra guard beyond spec)
  // Verifies the *default* parameter of isStateStale — distinct from
  // 6.1-UNIT-003/004 which pass the TTL explicitly. Fails if the default is
  // reverted to 5 min (which would return true for a 29-min-old state).
  // -------------------------------------------------------------------------
  test("R-007-GUARD: default TTL is 30 min — 29-min-old state not stale with no explicit TTL arg", () => {
    const twentyNineMinAgo = Date.now() - 29 * 60 * 1000;
    const state = makeState({ timestamp: twentyNineMinAgo });
    // If default TTL were 5 min, this would return true — must be false
    expect(isStateStale(state)).toBe(false);
  });
});
