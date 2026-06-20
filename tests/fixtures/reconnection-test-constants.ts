/**
 * Shared test constants and helpers for reconnection tests (Story 2.3).
 * RED PHASE: Room names use timestamp-based uniqueness for eventual parallel safety.
 * Green phase: replace with strong UUID (e.g. crypto.randomUUID()) per test.
 */

let roomCounter = 0;

/**
 * Generate a unique room name for test isolation.
 * Uses timestamp + incrementing counter to prevent parallel collisions.
 *
 * @param prefix - Optional room name prefix (defaults to "reconnection")
 */
export const testRoom = (prefix = "reconnection"): string =>
  `test-${prefix}-${Date.now()}-${++roomCounter}`;

/**
 * Pre-defined room name template for E2E tests needing specific URLs.
 * Generates deterministic but unique room names.
 */
export const testRoomE2E = (id: number): string =>
  `test-e2e-${Date.now()}-${id}`;
