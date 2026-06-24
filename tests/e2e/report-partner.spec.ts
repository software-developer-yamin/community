/**
 * Story 4.3: Distinguish Victim from Aggressor — E2E User Journey (ATDD, RED PHASE)
 *
 * All tests use test.skip() — they document EXPECTED UI behavior before implementation.
 * Remove test.skip() as each task is implemented to activate the green phase.
 *
 * Web surface: apps/web/src/app/dashboard/ (call-ended screen)
 * Native surface: apps/native/app/call/ended.tsx
 */
import { expect, test } from "@playwright/test";

const WEB_BASE = "http://localhost:3001";

// Top-level regex constants (Biome useTopLevelRegex)
const RE_REPORT_BTN = /report/i;
const RE_SUBMIT_BTN = /submit.report/i;
const RE_NON_PARTICIPATION = /non.participation/i;
const RE_ABUSE = /abuse/i;
const RE_TECHNICAL_FAILURE = /technical.failure/i;
const RE_OTHER = /other/i;
const RE_DETAILS = /details/i;
const RE_NON_PARTICIPATION_LABEL = /non.participation/i;
const RE_REPORT_SUBMITTED = /report submitted/i;
const RE_STRIKE_VOIDED = /strike.*voided|voided.*strike/i;
const RE_WINDOW_EXPIRED = /report window.*closed|60.second.*expired|too late/i;
const RE_REPORT_PARTNER_DIALOG = /report partner/i;

test.describe("Story 4.3: Report Partner — Web E2E (ATDD, RED PHASE)", () => {
  // =========================================================================
  // AC1 + AC2: Report flow appears on call-ended screen with reason selector
  // Priority: P0
  // =========================================================================

  test.skip("[P0] should show report option on call-ended screen after a short disconnect", async ({
    page,
  }) => {
    // THIS TEST WILL FAIL — report UI not yet implemented on web call-ended screen
    await page.goto(`${WEB_BASE}/dashboard/matching`);

    // EXPECTED: after a call ends, the ended screen shows a "Report" button
    await expect(
      page.getByRole("button", { name: RE_REPORT_BTN })
    ).toBeVisible();
  });

  test.skip("[P0] should display reason selector with all four options", async ({
    page,
  }) => {
    // THIS TEST WILL FAIL — report UI not yet implemented
    await page.goto(`${WEB_BASE}/dashboard/matching`);
    await page.getByRole("button", { name: RE_REPORT_BTN }).click();

    // EXPECTED: four reason options visible
    await expect(page.getByText(RE_NON_PARTICIPATION)).toBeVisible();
    await expect(page.getByText(RE_ABUSE)).toBeVisible();
    await expect(page.getByText(RE_TECHNICAL_FAILURE)).toBeVisible();
    await expect(page.getByText(RE_OTHER)).toBeVisible();
  });

  test.skip("[P0] should allow optional details text input up to 500 characters", async ({
    page,
  }) => {
    // THIS TEST WILL FAIL — details field not yet implemented
    await page.goto(`${WEB_BASE}/dashboard/matching`);
    await page.getByRole("button", { name: RE_REPORT_BTN }).click();

    await page.getByLabel(RE_NON_PARTICIPATION_LABEL).check();

    const detailsField = page.getByRole("textbox", { name: RE_DETAILS });
    await expect(detailsField).toBeVisible();
    await detailsField.fill("Partner was unresponsive the entire call.");
  });

  // =========================================================================
  // AC1: Confirmation shows strike voided
  // Priority: P0
  // =========================================================================

  test.skip("[P0] should show confirmation message with strike voided notice after submission", async ({
    page,
  }) => {
    // THIS TEST WILL FAIL — report submission UI not yet implemented
    await page.goto(`${WEB_BASE}/dashboard/matching`);
    await page.getByRole("button", { name: RE_REPORT_BTN }).click();

    await page.getByLabel(RE_NON_PARTICIPATION_LABEL).check();
    await page.getByRole("button", { name: RE_SUBMIT_BTN }).click();

    // EXPECTED: confirmation message mentioning strike voided
    await expect(page.getByText(RE_REPORT_SUBMITTED)).toBeVisible();
    await expect(page.getByText(RE_STRIKE_VOIDED)).toBeVisible();
  });

  // =========================================================================
  // AC5: Duplicate report prevention (UI)
  // Priority: P1
  // =========================================================================

  test.skip("[P1] should hide or disable report button after a report has been submitted", async ({
    page,
  }) => {
    // THIS TEST WILL FAIL — duplicate prevention UI not yet implemented
    await page.goto(`${WEB_BASE}/dashboard/matching`);

    await page.getByRole("button", { name: RE_REPORT_BTN }).click();
    await page.getByLabel(RE_OTHER).check();
    await page.getByRole("button", { name: RE_SUBMIT_BTN }).click();

    // EXPECTED: report button gone after submit
    await expect(
      page.getByRole("button", { name: RE_REPORT_BTN })
    ).not.toBeVisible();
  });

  // =========================================================================
  // AC6: 60-second window expired (UI feedback)
  // Priority: P1
  // =========================================================================

  test.skip("[P1] should show expired-window message when 60s has passed since call ended", async ({
    page,
  }) => {
    // THIS TEST WILL FAIL — expired window UI not yet implemented
    await page.goto(`${WEB_BASE}/dashboard/matching?reportExpired=1`);

    // EXPECTED: informational message that the report window has closed
    await expect(page.getByText(RE_WINDOW_EXPIRED)).toBeVisible();

    // EXPECTED: report button absent or disabled
    const reportBtn = page.getByRole("button", { name: RE_REPORT_BTN });
    const isVisible = await reportBtn.isVisible();
    if (isVisible) {
      expect(await reportBtn.isDisabled()).toBe(true);
    }
  });

  // =========================================================================
  // Accessibility
  // Priority: P2
  // =========================================================================

  test.skip("[P2] report dialog should be keyboard-navigable and screen-reader friendly", async ({
    page,
  }) => {
    // THIS TEST WILL FAIL — report UI not yet implemented
    await page.goto(`${WEB_BASE}/dashboard/matching`);
    await page.getByRole("button", { name: RE_REPORT_BTN }).click();

    // EXPECTED: dialog has accessible role
    await expect(
      page.getByRole("dialog", { name: RE_REPORT_PARTNER_DIALOG })
    ).toBeVisible();

    // EXPECTED: reason options are labelled radio inputs
    const radioGroup = page.getByRole("radiogroup");
    await expect(radioGroup).toBeVisible();
  });
});
