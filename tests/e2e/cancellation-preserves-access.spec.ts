import { expect, test } from "@playwright/test";

/**
 * ATDD Red-Phase E2E Tests — Story 5.5: Cancellation Preserves Access Until Period End
 *
 * TDD RED PHASE: All tests use test.skip() and assert expected behavior.
 * Activated tests WILL FAIL until the feature is implemented.
 * Remove test.skip() task-by-task as each AC is implemented.
 *
 * Coverage:
 *   AC-1: UI shows cancellation confirmation + access-until banner
 *   AC-3: UI allows re-enabling auto-renew within paid period
 *   AC-5/AC-6: UI gates on effective tier (expired vs. valid window)
 *   T5/T6: Subscription page displays tierExpiresAt, isCancelled, willExpireOn
 */

const SIGN_IN_BUTTON = /sign in/i;
const CANCEL_SUBSCRIPTION_BUTTON = /cancel subscription/i;
const CONFIRM_CANCEL_BUTTON = /confirm cancel/i;
const ACCESS_CONTINUES_UNTIL_TEXT = /your access continues until/i;
const CANCELLED_STATUS_TEXT = /cancelled/i;
const RE_ENABLE_AUTO_RENEW_BUTTON = /re-enable auto-renew|reactivate/i;
const CONFIRM_BUTTON = /confirm/i;
const ACTIVE_STATUS_TEXT = /active/i;
const UPGRADE_TO_PREMIUM_TEXT = /upgrade to premium/i;

test.describe("Cancellation Preserves Access — E2E Tests (ATDD, RED PHASE)", () => {
  // =========================================================================
  // AC-1: Subscription page shows cancellation state with access-until banner
  // Priority: P0
  // =========================================================================

  test.skip("[P0][AC-1] subscription page shows 'Access until <date>' banner after cancellation", async ({
    page,
  }) => {
    // THIS TEST WILL FAIL — UI banner not implemented yet

    // Login as premium user
    await page.goto("/auth/sign-in");
    await page.getByLabel("Email").fill("premium-user@example.com");
    await page.getByLabel("Password").fill("TestPass123!");
    await page.getByRole("button", { name: SIGN_IN_BUTTON }).click();
    await page.waitForURL("/");

    // Navigate to subscription page
    await page.goto("/settings/subscription");
    await page.waitForLoadState("networkidle");

    // Click cancel subscription button
    await page
      .getByRole("button", { name: CANCEL_SUBSCRIPTION_BUTTON })
      .click();

    // Confirm cancellation in dialog
    await page.getByRole("button", { name: CONFIRM_CANCEL_BUTTON }).click();

    // Expect success banner showing access-until date
    await expect(page.getByText(ACCESS_CONTINUES_UNTIL_TEXT)).toBeVisible();

    // The banner should show the expiry date
    const expiryBanner = page.getByTestId("access-until-banner");
    await expect(expiryBanner).toBeVisible();
    await expect(expiryBanner).not.toBeEmpty();
  });

  test.skip("[P0][AC-1] subscription page shows 'Cancelled' status badge after cancellation", async ({
    page,
  }) => {
    // THIS TEST WILL FAIL — cancelled status badge not implemented yet

    await page.goto("/auth/sign-in");
    await page.getByLabel("Email").fill("cancelled-premium@example.com");
    await page.getByLabel("Password").fill("TestPass123!");
    await page.getByRole("button", { name: SIGN_IN_BUTTON }).click();
    await page.waitForURL("/");

    await page.goto("/settings/subscription");
    await page.waitForLoadState("networkidle");

    // Should show "Cancelled" status
    await expect(page.getByText(CANCELLED_STATUS_TEXT)).toBeVisible();

    // Should show re-enable button
    await expect(
      page.getByRole("button", { name: RE_ENABLE_AUTO_RENEW_BUTTON })
    ).toBeVisible();
  });

  // =========================================================================
  // AC-3: UI allows re-enabling auto-renew from subscription page
  // Priority: P1
  // =========================================================================

  test.skip("[P1][AC-3] clicking 're-enable auto-renew' restores subscription and hides access-until banner", async ({
    page,
  }) => {
    // THIS TEST WILL FAIL — re-enable flow not implemented in UI yet

    await page.goto("/auth/sign-in");
    await page.getByLabel("Email").fill("cancelled-premium@example.com");
    await page.getByLabel("Password").fill("TestPass123!");
    await page.getByRole("button", { name: SIGN_IN_BUTTON }).click();
    await page.waitForURL("/");

    await page.goto("/settings/subscription");
    await page.waitForLoadState("networkidle");

    // Click re-enable
    await page
      .getByRole("button", { name: RE_ENABLE_AUTO_RENEW_BUTTON })
      .click();
    await page.getByRole("button", { name: CONFIRM_BUTTON }).click();

    // Banner should disappear
    await expect(page.getByTestId("access-until-banner")).not.toBeVisible();

    // Status should be "Active" again
    await expect(page.getByText(ACTIVE_STATUS_TEXT)).toBeVisible();
  });

  // =========================================================================
  // T5/T6: Subscription page renders the three new API fields correctly
  // Priority: P1
  // =========================================================================

  test.skip("[P1][T5/T6] subscription page shows correct tier expiry date for cancelled user", async ({
    page,
  }) => {
    // THIS TEST WILL FAIL — tierExpiresAt / willExpireOn not yet returned by API

    await page.goto("/auth/sign-in");
    await page.getByLabel("Email").fill("cancelled-premium@example.com");
    await page.getByLabel("Password").fill("TestPass123!");
    await page.getByRole("button", { name: SIGN_IN_BUTTON }).click();
    await page.waitForURL("/");

    await page.goto("/settings/subscription");
    await page.waitForLoadState("networkidle");

    // The "access until" date should match willExpireOn from API
    const expiryElement = page.getByTestId("access-until-banner");
    await expect(expiryElement).toBeVisible();

    // Ensure it contains a real date (not undefined/null)
    const expiryText = await expiryElement.textContent();
    expect(expiryText).toBeTruthy();
    expect(expiryText).not.toContain("undefined");
    expect(expiryText).not.toContain("null");
  });

  // =========================================================================
  // AC-5/AC-6: Feature gate enforcement in the native app / web profile settings
  // Priority: P0 — End-to-end gate verification
  // =========================================================================

  test.skip("[P0][AC-6] gender preference settings are accessible for cancelled user still in paid window", async ({
    page,
  }) => {
    // THIS TEST WILL FAIL — requires seeded test user with autoRenew=0, future tierExpiresAt

    await page.goto("/auth/sign-in");
    await page.getByLabel("Email").fill("cancelled-within-window@example.com");
    await page.getByLabel("Password").fill("TestPass123!");
    await page.getByRole("button", { name: SIGN_IN_BUTTON }).click();
    await page.waitForURL("/");

    // Navigate to profile / preference settings
    await page.goto("/settings/profile");
    await page.waitForLoadState("networkidle");

    // Gender preference selector should be enabled — still in paid window
    const genderPrefSelect = page.getByTestId("gender-preference-select");
    await expect(genderPrefSelect).toBeVisible();
    await expect(genderPrefSelect).not.toBeDisabled();
  });

  test.skip("[P0][AC-5] gender preference settings are locked after tierExpiresAt has passed", async ({
    page,
  }) => {
    // THIS TEST WILL FAIL — requires seeded test user with expired tierExpiresAt

    await page.goto("/auth/sign-in");
    await page.getByLabel("Email").fill("expired-pplus@example.com");
    await page.getByLabel("Password").fill("TestPass123!");
    await page.getByRole("button", { name: SIGN_IN_BUTTON }).click();
    await page.waitForURL("/");

    await page.goto("/settings/profile");
    await page.waitForLoadState("networkidle");

    // Gender preference selector should be disabled or show upgrade prompt
    const genderPrefSelect = page.getByTestId("gender-preference-select");
    const upgradeBanner = page.getByText(UPGRADE_TO_PREMIUM_TEXT);

    // Either the control is disabled OR an upgrade prompt is shown
    const isDisabled = await genderPrefSelect.isDisabled().catch(() => true);
    const hasUpgradeBanner = await upgradeBanner.isVisible().catch(() => false);

    expect(isDisabled || hasUpgradeBanner).toBe(true);
  });
});
