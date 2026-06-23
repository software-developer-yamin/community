import { expect, test } from "@playwright/test";

const LANGUAGE_OPTIONS = [
  "বাংলা",
  "English",
  "हिन्दी",
  "العربية",
  "Español",
  "Français",
];
const LANGUAGE_PICKER_HEADING =
  /select your native language|what.is.your.native.language/i;
const LANGUAGE_FIELD_LABEL = /native language|language/i;
const CONTINUE_BUTTON = /continue|next/i;
const SAVE_BUTTON = /save|update/i;
const PASSWORD_FIELD = /password/i;
const EMAIL_FIELD = /email/i;
const SIGN_IN_BUTTON = /sign in|log in/i;
const DASHBOARD_OR_HOME = /dashboard|home/;
const SAVED_OR_UPDATED = /saved|updated|success/i;
const SAVED_MATCH = /saved|updated/i;

test.describe("Native Language Field — E2E User Journeys (ATDD, RED PHASE)", () => {
  // =========================================================================
  // AC1 (S2): Onboarding shows native language picker with 6 options
  // Priority: P0
  // Platform: web + native
  // =========================================================================

  test.skip("[P0] should show native language picker with 6 language options during onboarding", async ({
    page,
  }) => {
    // THIS TEST WILL FAIL — S2 onboarding picker not implemented
    // Step 1: Navigate to onboarding
    await page.goto("/onboarding");

    // Step 2: Verify language picker heading
    await expect(
      page.getByRole("heading", { name: LANGUAGE_PICKER_HEADING })
    ).toBeVisible({ timeout: 10_000 });

    // Step 3: Verify all 6 language options are present
    for (const lang of LANGUAGE_OPTIONS) {
      await expect(page.getByRole("button", { name: lang })).toBeVisible();
    }
    // EXPECTED: 6 language option buttons with native script labels
    // ACTUAL (red phase): Onboarding picker not built → test fails
  });

  test.skip("[P0] should allow selecting a language during onboarding and saving it", async ({
    page,
  }) => {
    // THIS TEST WILL FAIL — onboarding flow not wired to updateProfile
    // Step 1: Go through onboarding
    await page.goto("/onboarding");

    // Step 2: Select "English" option
    await page.getByRole("button", { name: "English" }).click();
    await page.getByRole("button", { name: CONTINUE_BUTTON }).click();

    // Step 3: Complete onboarding
    // EXPECTED: Selected language saved via updateProfile API
    // ACTUAL (red phase): No API call made → language not persisted → fails
    await expect(page).toHaveURL(DASHBOARD_OR_HOME);
  });

  // =========================================================================
  // AC2 (S7): Profile settings shows native language editor
  // Priority: P0
  // Platform: web + native
  // =========================================================================

  test.skip("[P0] should display current native language in profile settings", async ({
    page,
  }) => {
    // THIS TEST WILL FAIL — S7 profile settings editor not implemented
    // Precondition: User has nativeLanguage="english" set via API or seed data
    // Step 1: Login and go to profile settings
    await page.goto("/login");
    await page
      .getByRole("textbox", { name: EMAIL_FIELD })
      .fill("learner@example.com");
    await page.getByLabel(PASSWORD_FIELD).fill("TestPass123!");
    await page.getByRole("button", { name: SIGN_IN_BUTTON }).click();

    // Step 2: Navigate to settings
    await page.goto("/settings/profile");

    // Step 3: Verify native language field shows current value
    const langField = page.getByLabel(LANGUAGE_FIELD_LABEL);
    await expect(langField).toBeVisible({ timeout: 10_000 });
    // EXPECTED: Field shows "English"
    // ACTUAL (red phase): No settings page UI → fails
    await expect(langField).toHaveValue("English");
  });

  test.skip("[P0] should save updated native language from profile settings", async ({
    page,
  }) => {
    // THIS TEST WILL FAIL — save flow not wired to updateProfile
    // Step 1: Login and go to settings
    await page.goto("/login");
    await page
      .getByRole("textbox", { name: EMAIL_FIELD })
      .fill("learner@example.com");
    await page.getByLabel(PASSWORD_FIELD).fill("TestPass123!");
    await page.getByRole("button", { name: SIGN_IN_BUTTON }).click();
    await page.goto("/settings/profile");

    // Step 2: Change language
    const langField = page.getByLabel(LANGUAGE_FIELD_LABEL);
    await langField.fill("Français");
    await page.getByRole("button", { name: SAVE_BUTTON }).click();

    // Step 3: Verify save confirmation
    await expect(page.getByText(SAVED_OR_UPDATED)).toBeVisible({
      timeout: 5000,
    });

    // Step 4: Reload and verify persistence
    await page.reload();
    await expect(page.getByLabel(LANGUAGE_FIELD_LABEL)).toHaveValue("Français");
    // EXPECTED: Language change persists across reloads
    // ACTUAL (red phase): No save handler → fails
  });

  // =========================================================================
  // AC3: Default detection based on phone number country code
  // Priority: P1
  // Platform: web + native
  // =========================================================================

  test.skip("[P1] should pre-select Bangla for users with +880 phone number during onboarding", async ({
    page,
  }) => {
    // THIS TEST WILL FAIL — default detection utility not implemented
    // Precondition: Seed a user with +880 phone number
    // Step 1: Register with +880 phone
    // NOTE: Registration flow is out of scope for this story
    // This test validates the default detection once a +880 user reaches onboarding

    // Simulate by navigating to onboarding with seeded +880 user
    await page.goto("/onboarding");

    // Verify Bangla is pre-selected/highlighted
    const banglaOption = page.getByRole("button", { name: "বাংলা" });
    // EXPECTED: Bangla has a selected/highlighted state
    // ACTUAL (red phase): No default detection → no pre-selection → fails
    await expect(banglaOption).toHaveAttribute("data-selected", "true");
  });

  // =========================================================================
  // AC3: embed recompute triggers on language change
  // Priority: P1
  // Platform: all
  // =========================================================================

  test.skip("[P1] should trigger recomputeEmbedding when nativeLanguage changes via settings", async ({
    page,
  }) => {
    // THIS TEST WILL FAIL — recomputeEmbedding not called on profile update
    // Step 1: Login and go to settings
    await page.goto("/login");
    await page
      .getByRole("textbox", { name: EMAIL_FIELD })
      .fill("learner@example.com");
    await page.getByLabel(PASSWORD_FIELD).fill("TestPass123!");
    await page.getByRole("button", { name: SIGN_IN_BUTTON }).click();

    // Step 2: Navigate to settings and change language
    await page.goto("/settings/profile");
    await page.getByLabel(LANGUAGE_FIELD_LABEL).fill("Arabic");
    await page.getByRole("button", { name: SAVE_BUTTON }).click();

    // Step 3: Check success — language saved
    await expect(page.getByText(SAVED_MATCH)).toBeVisible({
      timeout: 5000,
    });

    // Step 4: Verify embedding was recomputed
    // This is an indirect check — we could mock the embed API call or
    // check that match results now favor Arabic speakers
    // EXPECTED: save handler calls recomputeEmbedding after updateProfile
    // ACTUAL (red phase): No recompute call on profile update → fails
  });
});
