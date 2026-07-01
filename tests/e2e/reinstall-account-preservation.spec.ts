import { expect, test } from "@playwright/test";

/**
 * ATDD Red-Phase E2E Tests — Story 6.3: Reinstall Account Preservation
 *
 * TDD RED PHASE: All tests use test.skip() and assert expected behavior.
 * Activated tests WILL FAIL until the feature is implemented.
 * Remove test.skip() task-by-task as each AC is implemented.
 *
 * Coverage:
 *   AC-1: Sign-in with same credentials shows profile data intact (web)
 *   AC-2: Subscription page shows server-authoritative tier after re-auth
 *   AC-3: Cross-provider email-matching link prevents duplicate account on web
 *   AC-4: Native account recovery prompt appears when profile is missing (native — noted)
 *   AC-6: Profile page shows call history and CEFR level after re-auth
 *
 * Note: T3 (AccountRecovery component) is native-only — no Playwright E2E coverage possible
 * for the native app. The E2E tests below cover the web surface (Next.js) where applicable.
 * AC-4/T3 native behavior is verified via manual testing or Detox tests (out of scope here).
 */

const SIGN_IN_BUTTON = /sign in/i;
const EMAIL_LABEL = /email/i;
const PASSWORD_LABEL = /password/i;
const CEFR_LEVEL_REGEX = /B2/;
const NATIVE_LANGUAGE_REGEX = /Bengali/i;
const SUBSCRIPTION_TIER_REGEX = /Premium/i;
const SUBSCRIPTION_STATUS_REGEX = /Active/i;

test.describe("Reinstall Account Preservation — E2E Tests (ATDD, RED PHASE)", () => {
  // =========================================================================
  // AC-1: Same-method reinstall restores full account (web surface)
  // Priority: P0 — Core reinstall guarantee
  // =========================================================================

  test.skip("[P0][AC-1] signing in with the same email/password shows profile name and CEFR level on home page", async ({
    page,
  }) => {
    // THIS TEST WILL FAIL — requires seeded user with cefrLevel and profile visible on home page

    await page.goto("/auth/sign-in");
    await page.getByLabel(EMAIL_LABEL).fill("reinstall-email@example.com");
    await page.getByLabel(PASSWORD_LABEL).fill("TestPass123!");
    await page.getByRole("button", { name: SIGN_IN_BUTTON }).click();
    await page.waitForURL("/");

    // Profile data must be visible immediately after sign-in
    // (All data is server-authoritative — nothing lost on reinstall)
    await expect(page.getByTestId("user-cefr-level")).toHaveText(
      CEFR_LEVEL_REGEX
    );
  });

  test.skip("[P0][AC-1] profile page shows nativeLanguage and totalCallCount after re-authentication", async ({
    page,
  }) => {
    // THIS TEST WILL FAIL — requires seeded user + profile page at /profile or /settings/profile

    await page.goto("/auth/sign-in");
    await page.getByLabel(EMAIL_LABEL).fill("reinstall-email@example.com");
    await page.getByLabel(PASSWORD_LABEL).fill("TestPass123!");
    await page.getByRole("button", { name: SIGN_IN_BUTTON }).click();
    await page.waitForURL("/");

    await page.goto("/settings/profile");
    await page.waitForLoadState("networkidle");

    // Profile page must display server-stored data (not device-stored)
    await expect(page.getByTestId("native-language")).toHaveText(
      NATIVE_LANGUAGE_REGEX
    );
    await expect(page.getByTestId("total-call-count")).not.toBeEmpty();
  });

  // =========================================================================
  // AC-2: Subscription state is server-authoritative (web surface)
  // Priority: P0 — Billing invariant
  // =========================================================================

  test.skip("[P0][AC-2] subscription page shows correct tier immediately after sign-in (no local cache)", async ({
    page,
  }) => {
    // THIS TEST WILL FAIL — requires seeded premium user

    await page.goto("/auth/sign-in");
    await page.getByLabel(EMAIL_LABEL).fill("reinstall-email@example.com");
    await page.getByLabel(PASSWORD_LABEL).fill("TestPass123!");
    await page.getByRole("button", { name: SIGN_IN_BUTTON }).click();
    await page.waitForURL("/");

    await page.goto("/settings/subscription");
    await page.waitForLoadState("networkidle");

    // Tier must come from the server on every load — no local storage used
    await expect(page.getByTestId("subscription-tier")).toHaveText(
      SUBSCRIPTION_TIER_REGEX
    );
    await expect(page.getByTestId("subscription-status")).toHaveText(
      SUBSCRIPTION_STATUS_REGEX
    );
  });

  // =========================================================================
  // AC-3: Cross-provider email-matching account linking (T1 — web surface)
  // Priority: P1 — Duplicate-user prevention
  // =========================================================================

  test.skip("[P1][AC-3] signing in with Google for an existing email/password account shows same profile data", async ({
    page,
  }) => {
    // THIS TEST WILL FAIL — T1 (accountLinking) not yet enabled + no Google OAuth in E2E

    // Sign in with email/password first
    await page.goto("/auth/sign-in");
    await page.getByLabel(EMAIL_LABEL).fill("reinstall-google@example.com");
    await page.getByLabel(PASSWORD_LABEL).fill("TestPass123!");
    await page.getByRole("button", { name: SIGN_IN_BUTTON }).click();
    await page.waitForURL("/");

    // Confirm profile is visible
    await page.goto("/settings/profile");
    await page.waitForLoadState("networkidle");

    // Profile data must be present (CEFR, native language etc.)
    await expect(page.getByTestId("native-language")).not.toBeEmpty();

    // NOTE: Full Google OAuth E2E test requires OAuth mock integration
    // The API-level test in tests/api/reinstall-account-preservation.spec.ts
    // provides deeper AC-3 coverage at the protocol level.
  });

  // =========================================================================
  // AC-6: Profile and history accessible after reinstall (web surface)
  // Priority: P0 — Data persistence guarantee
  // =========================================================================

  test.skip("[P0][AC-6] call history page shows pre-install call records after re-authentication", async ({
    page,
  }) => {
    // THIS TEST WILL FAIL — requires seeded call history + call history page at /history

    await page.goto("/auth/sign-in");
    await page.getByLabel(EMAIL_LABEL).fill("reinstall-email@example.com");
    await page.getByLabel(PASSWORD_LABEL).fill("TestPass123!");
    await page.getByRole("button", { name: SIGN_IN_BUTTON }).click();
    await page.waitForURL("/");

    await page.goto("/history");
    await page.waitForLoadState("networkidle");

    // At least one call record must be visible — server-side data, not device-local
    const callItems = page.getByTestId("call-history-item");
    await expect(callItems.first()).toBeVisible();
  });

  test.skip("[P0][AC-6] settings page shows call rating history without requiring device storage", async ({
    page,
  }) => {
    // THIS TEST WILL FAIL — requires seeded user with rated calls

    await page.goto("/auth/sign-in");
    await page.getByLabel(EMAIL_LABEL).fill("reinstall-email@example.com");
    await page.getByLabel(PASSWORD_LABEL).fill("TestPass123!");
    await page.getByRole("button", { name: SIGN_IN_BUTTON }).click();
    await page.waitForURL("/");

    await page.goto("/history");
    await page.waitForLoadState("networkidle");

    // Ratings must be visible — stored server-side, not lost on reinstall
    const ratingBadge = page.getByTestId("call-rating-badge").first();
    await expect(ratingBadge).toBeVisible();
    await expect(ratingBadge).not.toBeEmpty();
  });
});
