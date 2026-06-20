import { expect, test } from "@playwright/test";
import { testRoom } from "../fixtures/reconnection-test-constants";

test.describe("Full Reconnection — E2E User Journeys (ATDD, RED PHASE)", () => {
  // =========================================================================
  // AC1: 10s blip — countdown visible
  // Priority: P0
  // Platform: web + native
  // =========================================================================

  test.skip("[P0] should show reconnecting banner with countdown on 10s blip", async ({
    page,
    context,
  }) => {
    const roomName = testRoom();

    // THIS TEST WILL FAIL — ReconnectingBanner countdown not implemented
    // Step 1: Navigate to call page
    await page.goto(`/call/${roomName}`);

    // Verify we're in the call
    await expect(page.getByTestId("call-active")).toBeVisible({
      timeout: 10_000,
    });

    // Step 2: Simulate network blip by setting offline
    await context.setOffline(true);

    // Step 3: Verify reconnecting banner appears with countdown
    // EXPECTED: "Reconnecting... (0s)" increments each second
    // ACTUAL (red phase): Banner exists from Story 2.2 but no countdown → fails
    await expect(page.getByTestId("reconnecting-banner")).toBeVisible({
      timeout: 5000,
    });
    const countdownText = await page
      .getByTestId("reconnection-countdown")
      .textContent();
    expect(countdownText).toMatch(/Reconnecting\.\.\. \(\d+s\)/);

    // Step 4: Countdown should increase
    // FIXME: Replace waitForTimeout with deterministic wait during green phase
    await page.waitForTimeout(2000);
    const laterText = await page
      .getByTestId("reconnection-countdown")
      .textContent();
    expect(laterText).toMatch(/Reconnecting\.\.\. \(\d+s\)/);
    const currentSeconds = Number.parseInt(
      laterText?.match(/(\d+)s/)?.[1] ?? "0",
      10
    );
    expect(currentSeconds).toBeGreaterThanOrEqual(2);
  });

  // =========================================================================
  // AC1 & AC2: Network recovers before 30s — banner hides
  // Priority: P0
  // =========================================================================

  test.skip("[P0] should hide reconnecting banner and resume call when network recovers before 30s", async ({
    page,
    context,
  }) => {
    const roomName = testRoom();

    // THIS TEST WILL FAIL — recovery flow not implemented
    // Step 1: Join call
    await page.goto(`/call/${roomName}`);
    await expect(page.getByTestId("call-active")).toBeVisible({
      timeout: 10_000,
    });

    // Step 2: Trigger blip
    await context.setOffline(true);
    await expect(page.getByTestId("reconnecting-banner")).toBeVisible({
      timeout: 5000,
    });

    // Step 3: Restore network after brief blip
    // FIXME: Replace waitForTimeout with deterministic wait during green phase
    await page.waitForTimeout(1000);
    await context.setOffline(false);

    // Step 4: Banner should disappear and call resumes
    // EXPECTED: Banner hides within 2s of network recovery
    // ACTUAL (red phase): No recovery detection → banner stays → fails
    await expect(page.getByTestId("reconnecting-banner")).not.toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByTestId("call-active")).toBeVisible({
      timeout: 5000,
    });
  });

  // =========================================================================
  // AC2: 30s timeout → "connection lost" prompt
  // Priority: P0
  // =========================================================================

  test.skip("[P0] should show 'connection lost' prompt after 30s of network loss", async ({
    page,
    context,
  }) => {
    const roomName = testRoom();

    // THIS TEST WILL FAIL — ConnectionLostPrompt not implemented
    // Nota: 30s real time is slow; this test verifies the UI renders the prompt
    // In CI this would use a faster timeout override via test configuration

    await page.goto(`/call/${roomName}`);
    await expect(page.getByTestId("call-active")).toBeVisible({
      timeout: 10_000,
    });

    // Simulate extended network loss
    await context.setOffline(true);
    await expect(page.getByTestId("reconnecting-banner")).toBeVisible({
      timeout: 5000,
    });

    // Wait for timeout to trigger (use a test-only timeout override via URL param or localStorage)
    // e.g. /call/${roomName}?reconnectTimeout=5000 for testing
    // EXPECTED: After timeout, ConnectionLostPrompt shows with retry + end buttons
    // ACTUAL (red phase): No prompt → test fails
    await expect(page.getByTestId("connection-lost-prompt")).toBeVisible({
      timeout: 40_000,
    });

    // Verify both buttons present
    await expect(page.getByTestId("retry-button")).toBeVisible();
    await expect(page.getByTestId("end-call-button")).toBeVisible();
  });

  // =========================================================================
  // AC3: Retry triggers reconnection
  // Priority: P0
  // =========================================================================

  test.skip("[P0] should attempt reconnection when user taps retry button", async ({
    page,
    context,
  }) => {
    const roomName = testRoom();

    // THIS TEST WILL FAIL — retry flow not implemented
    await page.goto(`/call/${roomName}`);
    await expect(page.getByTestId("call-active")).toBeVisible({
      timeout: 10_000,
    });

    // Trigger timeout via short timeout override
    await context.setOffline(true);
    await expect(page.getByTestId("connection-lost-prompt")).toBeVisible({
      timeout: 40_000,
    });

    // Tap retry
    await page.getByTestId("retry-button").click();

    // EXPECTED: Reconnecting banner reappears, countdown resets
    // ACTUAL (red phase): No retry flow → stays on prompt → fails
    await expect(page.getByTestId("reconnecting-banner")).toBeVisible({
      timeout: 10_000,
    });
  });

  // =========================================================================
  // AC4: End call with "connection lost" reason
  // Priority: P0
  // =========================================================================

  test.skip("[P0] should end call with 'connection lost' reason when user taps end", async ({
    page,
    context,
  }) => {
    const roomName = testRoom();

    // THIS TEST WILL FAIL — endCall during reconnection not implemented
    await page.goto(`/call/${roomName}`);
    await expect(page.getByTestId("call-active")).toBeVisible({
      timeout: 10_000,
    });

    // Trigger connection lost prompt
    await context.setOffline(true);
    await expect(page.getByTestId("connection-lost-prompt")).toBeVisible({
      timeout: 40_000,
    });

    // Tap end call
    await page.getByTestId("end-call-button").click();

    // EXPECTED: Call ends, end screen shows "Connection lost" reason
    // ACTUAL (red phase): Either stays on call screen or shows wrong reason → fails
    await expect(page.getByTestId("call-ended-screen")).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByTestId("end-reason")).toContainText(
      "connection lost"
    );
  });

  // =========================================================================
  // AC5: Grace window
  // Priority: P0
  // =========================================================================

  test.skip("[P0] should NOT show 'connection lost' if network recovers within 5s grace window", async ({
    page,
    context,
  }) => {
    const roomName = testRoom();

    // THIS TEST WILL FAIL — grace window logic not implemented
    await page.goto(`/call/${roomName}`);
    await expect(page.getByTestId("call-active")).toBeVisible({
      timeout: 10_000,
    });

    // Trigger timeout condition
    await context.setOffline(true);
    await expect(page.getByTestId("reconnecting-banner")).toBeVisible({
      timeout: 5000,
    });

    // Wait until just after 30s timeout would trigger (use test override)
    // Then restore network within grace window
    // In real test: use a short timeout override, restore before grace expires
    await context.setOffline(false);

    // EXPECTED: No connection lost prompt, call resumes
    // ACTUAL (red phase): Prompt shows despite recovery → fails
    await expect(page.getByTestId("connection-lost-prompt")).not.toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByTestId("reconnecting-banner")).not.toBeVisible({
      timeout: 10_000,
    });
  });

  // =========================================================================
  // Partner notification (AC3)
  // Priority: P1
  // =========================================================================

  test.skip("[P1] should show partner reconnecting indicator after 10s+ blip", async ({
    page,
  }) => {
    // THIS TEST WILL FAIL — partner notification not implemented
    // This test simulates the partner's view
    // In real E2E this would use two browser contexts; here we check the UI exists

    await page.goto("/call/test-room-dynamic-107");

    // Partner sees a subtle indicator when the other user is reconnecting
    // This would be triggered by a server event or data channel message
    // For the red phase, we test that the UI element exists
    await expect(
      page.getByTestId("partner-reconnecting-indicator")
    ).toBeVisible({
      timeout: 15_000,
    });
  });

  test.skip("[P1] should NOT end call on partner side when user reconnects", async ({
    page,
  }) => {
    // THIS TEST WILL FAIL — partner does not navigate away on reconnect
    await page.goto("/call/test-room-dynamic-108");

    // Partner sees reconnecting indicator
    await expect(
      page.getByTestId("partner-reconnecting-indicator")
    ).toBeVisible({
      timeout: 15_000,
    });

    // After some time, partner should see user reconnect
    // EXPECTED: Call continues, partner stays on call screen
    // ACTUAL (red phase): Partner may navigate away → test fails
    await expect(page.getByTestId("call-active")).toBeVisible({
      timeout: 20_000,
    });

    // Partner indicator should disappear
    await expect(
      page.getByTestId("partner-reconnecting-indicator")
    ).not.toBeVisible({
      timeout: 10_000,
    });
  });
});
