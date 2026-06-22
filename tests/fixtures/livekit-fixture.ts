import { test as base } from "@playwright/test";

/**
 * Playwright fixture for isolating and cleaning up LiveKit call rooms.
 * Extends base test with auto-cleanup during teardown phase.
 */
export const test = base.extend<{
  livekitRoom: string;
}>({
  livekitRoom: async ({ request }, use) => {
    // Setup: Generate a unique room name
    const roomName = `test-room-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    // Pass the room name to the test
    await use(roomName);

    // Teardown: Clean up the room on the server to prevent leakages
    try {
      await request.post("/api/call/end", {
        data: {
          roomName,
          reason: "teardown",
        },
      });
    } catch {
      // Suppress teardown errors in red phase
    }
  },
});
