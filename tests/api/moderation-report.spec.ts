/**
 * Story 4.3: Distinguish Victim from Aggressor — API Contract Tests (ATDD, RED PHASE)
 *
 * All tests use test.skip() — they document EXPECTED behavior before implementation.
 * Remove test.skip() as each task is implemented to activate the green phase.
 */
import { expect, test } from "@playwright/test";

import {
  MOD_API_TIMEOUT,
  REPORT_REASONS,
} from "../fixtures/moderation-test-constants";

const RPC_BASE = "http://localhost:3000/rpc";
const REPORT_ENDPOINT = `${RPC_BASE}/moderation/reportPartner`;

// ---------------------------------------------------------------------------
// AC1 + AC2: Report voids strike — reason selection
// ---------------------------------------------------------------------------

test.describe("Story 4.3: reportPartner API — Red Phase ATDD", () => {
  // =========================================================================
  // AC1: Report voids strike for reporter
  // Priority: P0
  // =========================================================================

  test.skip("[P0] should void reporter's short-disconnect strike when report is submitted within 60s", async ({
    request,
  }) => {
    // THIS TEST WILL FAIL — 60-second window check not yet enforced
    // Setup: a room that just ended (within 60s) where reporter has a strike

    const res = await request.post(REPORT_ENDPOINT, {
      data: {
        roomName: "test-room-recent-ended",
        reason: "non_participation",
      },
      headers: { "x-test-user": "reporter-with-strike" },
      timeout: MOD_API_TIMEOUT,
    });

    // EXPECTED: 200 with success + voided strike
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).toMatchObject({
      success: true,
      strikeVoided: true,
    });
  });

  // =========================================================================
  // AC2: Report with reason selection
  // Priority: P0
  // =========================================================================

  test.skip("[P0] should accept all valid report reasons", async ({
    request,
  }) => {
    // THIS TEST WILL FAIL — reportPartner endpoint not yet exercised in ATDD
    for (const reason of REPORT_REASONS) {
      const res = await request.post(REPORT_ENDPOINT, {
        data: {
          roomName: `test-room-reason-${reason}`,
          reason,
        },
        timeout: MOD_API_TIMEOUT,
      });
      // EXPECTED: accepted for all valid reasons
      expect(res.status()).not.toBe(422);
    }
  });

  test.skip("[P0] should accept optional details up to 500 chars", async ({
    request,
  }) => {
    // THIS TEST WILL FAIL — reportPartner endpoint not exercised
    const details = "x".repeat(500);
    const res = await request.post(REPORT_ENDPOINT, {
      data: {
        roomName: "test-room-with-details",
        reason: "other",
        details,
      },
      timeout: MOD_API_TIMEOUT,
    });
    expect(res.ok()).toBeTruthy();
  });

  test.skip("[P1] should reject details longer than 500 chars", async ({
    request,
  }) => {
    // THIS TEST WILL FAIL
    const details = "x".repeat(501);
    const res = await request.post(REPORT_ENDPOINT, {
      data: {
        roomName: "test-room-long-details",
        reason: "other",
        details,
      },
      timeout: MOD_API_TIMEOUT,
    });
    // EXPECTED: 422 validation error
    expect(res.status()).toBe(422);
  });

  test.skip("[P1] should reject invalid reason values", async ({ request }) => {
    // THIS TEST WILL FAIL
    const res = await request.post(REPORT_ENDPOINT, {
      data: {
        roomName: "test-room-bad-reason",
        reason: "invalid_reason",
      },
      timeout: MOD_API_TIMEOUT,
    });
    // EXPECTED: 422 validation error
    expect(res.status()).toBe(422);
  });

  // =========================================================================
  // AC3: Partner flagged for review + abuse-linked strike
  // Priority: P0
  // =========================================================================

  test.skip("[P0] should flag partner for review on any report", async ({
    request,
  }) => {
    // THIS TEST WILL FAIL — partner profile flagging not yet verified via API
    const res = await request.post(REPORT_ENDPOINT, {
      data: {
        roomName: "test-room-flag-partner",
        reason: "non_participation",
      },
      timeout: MOD_API_TIMEOUT,
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    // EXPECTED: partner is flagged
    expect(body).toMatchObject({
      success: true,
      partnerFlagged: true,
    });
  });

  test.skip("[P0] should add reported-type strike on partner when reason is abuse", async ({
    request,
  }) => {
    // THIS TEST WILL FAIL — abuse strike path not yet validated in ATDD
    const res = await request.post(REPORT_ENDPOINT, {
      data: {
        roomName: "test-room-abuse-report",
        reason: "abuse",
      },
      timeout: MOD_API_TIMEOUT,
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    // EXPECTED: partner gets an abuse strike AND flagged
    expect(body).toMatchObject({
      success: true,
      partnerFlagged: true,
      partnerStrikeAdded: true,
    });
  });

  test.skip("[P1] should NOT add partner strike for non-abuse reasons", async ({
    request,
  }) => {
    // THIS TEST WILL FAIL
    const res = await request.post(REPORT_ENDPOINT, {
      data: {
        roomName: "test-room-non-abuse",
        reason: "technical_failure",
      },
      timeout: MOD_API_TIMEOUT,
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    // EXPECTED: flagged but no extra strike
    expect(body).toMatchObject({
      success: true,
      partnerFlagged: true,
    });
    expect(body.partnerStrikeAdded).toBeFalsy();
  });

  // =========================================================================
  // AC4: Mutual report — both flagged, no strike for either
  // Priority: P1
  // =========================================================================

  test.skip("[P1] mutual report: both users flagged, neither receives a strike for that call", async ({
    request,
  }) => {
    // THIS TEST WILL FAIL — mutual report logic requires two authenticated users
    // User A reports User B
    const resA = await request.post(REPORT_ENDPOINT, {
      data: {
        roomName: "test-room-mutual",
        reason: "non_participation",
      },
      headers: { "x-test-user": "user-a" },
      timeout: MOD_API_TIMEOUT,
    });
    expect(resA.ok()).toBeTruthy();

    // User B reports User A
    const resB = await request.post(REPORT_ENDPOINT, {
      data: {
        roomName: "test-room-mutual",
        reason: "non_participation",
      },
      headers: { "x-test-user": "user-b" },
      timeout: MOD_API_TIMEOUT,
    });
    expect(resB.ok()).toBeTruthy();

    // EXPECTED: both voided, both flagged
    const bodyA = await resA.json();
    const bodyB = await resB.json();
    expect(bodyA).toMatchObject({ success: true, strikeVoided: true });
    expect(bodyB).toMatchObject({ success: true, strikeVoided: true });
  });

  // =========================================================================
  // AC5: One report per room per user
  // Priority: P1
  // =========================================================================

  test.skip("[P1] should reject duplicate report from same user for same room", async ({
    request,
  }) => {
    // THIS TEST WILL FAIL — duplicate check not yet exercised in ATDD
    const payload = {
      roomName: "test-room-duplicate",
      reason: "other" as const,
    };

    // First report succeeds
    await request.post(REPORT_ENDPOINT, {
      data: payload,
      timeout: MOD_API_TIMEOUT,
    });

    // Second report is rejected
    const res = await request.post(REPORT_ENDPOINT, {
      data: payload,
      timeout: MOD_API_TIMEOUT,
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    // EXPECTED: { success: false, alreadyReported: true }
    expect(body).toMatchObject({
      success: false,
      alreadyReported: true,
    });
  });

  // =========================================================================
  // AC6: 60-second report window enforced
  // Priority: P1
  // =========================================================================

  test.skip("[P1] should reject report submitted more than 60s after call ended", async ({
    request,
  }) => {
    // THIS TEST WILL FAIL — 60s window enforcement not yet exercised
    const res = await request.post(REPORT_ENDPOINT, {
      data: {
        roomName: "test-room-expired-window",
        reason: "non_participation",
      },
      timeout: MOD_API_TIMEOUT,
    });
    // EXPECTED: error — window closed
    expect(res.ok()).toBeFalsy();
    const body = await res.json();
    expect(body.message ?? body.error ?? JSON.stringify(body)).toContain(
      "REPORT_WINDOW_CLOSED"
    );
  });

  test.skip("[P1] should accept report submitted exactly at the 60s boundary (within window)", async ({
    request,
  }) => {
    // THIS TEST WILL FAIL — boundary test for REPORT_WINDOW_MS
    // Room ended exactly REPORT_WINDOW_MS - 1ms ago → should succeed
    const res = await request.post(REPORT_ENDPOINT, {
      data: {
        roomName: "test-room-boundary-within",
        reason: "non_participation",
      },
      timeout: MOD_API_TIMEOUT,
    });
    // EXPECTED: success
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  // =========================================================================
  // Security / Edge Cases
  // Priority: P1
  // =========================================================================

  test.skip("[P1] should reject report from user who was not a participant", async ({
    request,
  }) => {
    // THIS TEST WILL FAIL
    const res = await request.post(REPORT_ENDPOINT, {
      data: {
        roomName: "test-room-non-participant",
        reason: "non_participation",
      },
      headers: { "x-test-user": "outsider-user" },
      timeout: MOD_API_TIMEOUT,
    });
    // EXPECTED: error — not a participant
    expect(res.ok()).toBeFalsy();
  });

  test.skip("[P1] should reject report for a room that has not ended", async ({
    request,
  }) => {
    // THIS TEST WILL FAIL
    const res = await request.post(REPORT_ENDPOINT, {
      data: {
        roomName: "test-room-still-active",
        reason: "non_participation",
      },
      timeout: MOD_API_TIMEOUT,
    });
    // EXPECTED: error — room not ended
    expect(res.ok()).toBeFalsy();
    const body = await res.json();
    expect(body.message ?? body.error ?? JSON.stringify(body)).toContain(
      "NOT_FOUND"
    );
  });

  test.skip("[P2] should require authentication to report", async ({
    request,
  }) => {
    // THIS TEST WILL FAIL
    const res = await request.post(REPORT_ENDPOINT, {
      data: {
        roomName: "test-room-unauth",
        reason: "other",
      },
      // No auth headers
      timeout: MOD_API_TIMEOUT,
    });
    // EXPECTED: 401 unauthorized
    expect(res.status()).toBe(401);
  });
});
