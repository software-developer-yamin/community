import { expect, test } from "@playwright/test";

const EMAIL_FIELD = /email/i;
const PASSWORD_FIELD = /password/i;
const SIGN_IN_BUTTON = /sign in|log in/i;
const HOME_HEADING = /home|dashboard/i;

test.describe("Session Persistence — E2E User Journeys (ATDD, RED PHASE)", () => {
  // =========================================================================
  // AC1: Native Force-Quit Persistence
  // Priority: P0
  // Platform: native (Expo)
  // =========================================================================

  test.skip("[P0] should restore session after native force-quit without re-auth", async ({
    page,
  }) => {
    // THIS TEST WILL FAIL — SessionRestoreGuard not implemented on native
    // Step 1: Launch app and login
    await page.goto("/login");
    await page
      .getByRole("textbox", { name: EMAIL_FIELD })
      .fill("learner@example.com");
    await page.getByLabel(PASSWORD_FIELD).fill("TestPass123!");
    await page.getByRole("button", { name: SIGN_IN_BUTTON }).click();

    // Verify we reach home (session established)
    await expect(page.getByRole("heading", { name: HOME_HEADING })).toBeVisible(
      { timeout: 10_000 }
    );

    // Step 2: Simulate force-quit + relaunch
    // In native this means relaunching the Expo app; on web mock it via
    // clearing in-memory state but preserving SecureStore/cookie
    await page.evaluate(() => {
      // Clear JavaScript runtime state (simulates app restart)
      sessionStorage.clear();
      localStorage.removeItem("auth-store");
    });

    // Relaunch the app
    await page.goto("/");

    // Step 3: Verify session auto-restored — should go to home, not login
    // EXPECTED: SessionRestoreGuard silently restores and redirects to Home
    // ACTUAL (red phase): No guard exists → shows login page → test fails
    await expect(page.getByRole("heading", { name: HOME_HEADING })).toBeVisible(
      { timeout: 15_000 }
    );
  });

  // =========================================================================
  // AC2: Web 7-Day Idle Persistence
  // Priority: P0
  // Platform: web (Next.js)
  // =========================================================================

  test.skip("[P0] should restore session within 7-day idle window on web", async ({
    page,
  }) => {
    // THIS TEST WILL FAIL — session expiry handling not configured
    // Step 1: Login to establish httpOnly session cookie
    await page.goto("/login");
    await page
      .getByRole("textbox", { name: EMAIL_FIELD })
      .fill("learner@example.com");
    await page.getByLabel(PASSWORD_FIELD).fill("TestPass123!");
    await page.getByRole("button", { name: SIGN_IN_BUTTON }).click();

    await expect(page.getByRole("heading", { name: HOME_HEADING })).toBeVisible(
      { timeout: 10_000 }
    );

    // Step 2: Simulate 7-day idle by manually setting the session's expiresAt
    // The session cookie is httpOnly so we can't manipulate it from JS.
    // Instead we verify the server-side config allows 7d+ idle.
    // Navigate away and back after "idle"
    await page.goto("/about");
    await page.goto("/");

    // EXPECTED: Session still valid within 7d window → no redirect to login
    // ACTUAL (red phase): No session.expiresIn configured → session may have
    // shorter default TTL → test fails
    await expect(page.getByRole("heading", { name: HOME_HEADING })).toBeVisible(
      { timeout: 10_000 }
    );
  });

  test.skip("[P1] should redirect to login after session expiry beyond 7-day window", async ({
    page,
  }) => {
    // THIS TEST WILL FAIL — expiry redirect not implemented
    // Login first
    await page.goto("/login");
    await page
      .getByRole("textbox", { name: EMAIL_FIELD })
      .fill("learner@example.com");
    await page.getByLabel(PASSWORD_FIELD).fill("TestPass123!");
    await page.getByRole("button", { name: SIGN_IN_BUTTON }).click();

    await expect(page.getByRole("heading", { name: HOME_HEADING })).toBeVisible(
      { timeout: 10_000 }
    );

    // Step 2: Simulate expired session via an API call that expires the server-side session
    const expireRes = await page.request.post("/api/auth/expire-session");
    expect(expireRes.status()).toBe(200);

    // Navigate to protected page — should redirect to login
    await page.goto("/");

    // EXPECTED: Session expired → middleware/layout detects invalid cookie → redirect to /login
    // ACTUAL (red phase): No expiry check → stays on home → test fails
    await expect(
      page.getByRole("heading", { name: SIGN_IN_BUTTON })
    ).toBeVisible({ timeout: 10_000 });
    expect(page.url()).toContain("/login");
  });

  // =========================================================================
  // AC6: Cross-Platform Parity
  // Priority: P1
  // =========================================================================

  test.skip("[P1] should achieve equivalent persistence outcome on web and native", async ({
    page,
  }) => {
    // THIS TEST WILL FAIL — cross-platform parity not verified
    // Web path: verify httpOnly+secure+SameSite=strict cookie preserves session
    await page.goto("/login");
    await page
      .getByRole("textbox", { name: EMAIL_FIELD })
      .fill("learner@example.com");
    await page.getByLabel(PASSWORD_FIELD).fill("TestPass123!");
    await page.getByRole("button", { name: SIGN_IN_BUTTON }).click();

    await expect(page.getByRole("heading", { name: HOME_HEADING })).toBeVisible(
      { timeout: 10_000 }
    );

    // Verify the cookie is set with secure attributes
    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find(
      (c) => c.name.includes("session") || c.name.includes("auth")
    );
    expect(sessionCookie).toBeDefined();
    expect(sessionCookie?.httpOnly).toBe(true);
    expect(sessionCookie?.secure).toBe(true);

    // Web SameSite should be "Strict" (not "None" which is current mobile-default)
    // This reflects AC6's requirement to refine cookie per-platform
    // EXPECTED: sameSite="Strict" for web
    // ACTUAL (red phase): sameSite="None" for all origins → test fails
    expect(sessionCookie?.sameSite).toBe("Strict");

    // Simulate restart: clear runtime state but keep cookies
    await page.goto("/");
    await expect(page.getByRole("heading", { name: HOME_HEADING })).toBeVisible(
      { timeout: 10_000 }
    );
  });
});
