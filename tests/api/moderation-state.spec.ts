import { expect, test } from "@playwright/test";

const API_BASE = "http://localhost:3000/api";

test.describe("Moderation: Visible Moderation State — API Contract Tests (ATDD, RED PHASE)", () => {
  // =========================================================================
  // AC1-C2: getStrikes returns readableState for every state
  // Priority: P0
  // =========================================================================

  test.skip("[P0] returns readableState with label for clean state", async ({
    request,
  }) => {
    // THIS TEST WILL FAIL — readableState not added to getStrikes response
    // Given a user with <3 strikes (clean state)
    // When they call getStrikes
    // Then response includes readableState with label "Good standing"
    const res = await request.get(`${API_BASE}/moderation/strikes`);
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    expect(body).toHaveProperty("readableState");
    expect(body.readableState).toMatchObject({
      label: "Good standing",
      action: null,
      actionLink: null,
    });
    expect(body.readableState.description).toBeTruthy();
    expect(typeof body.readableState.description).toBe("string");
  });

  test.skip("[P0] returns readableState for warned state with strike count interpolation", async ({
    request,
  }) => {
    // THIS TEST WILL FAIL — readableState not returned for warned state
    // Given a user with 3-4 strikes (warned state)
    // When they call getStrikes
    // Then response includes readableState with label containing "Warning"
    // And description contains the strike count
    const res = await request.get(`${API_BASE}/moderation/strikes`);
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    expect(body).toHaveProperty("readableState");
    expect(body.readableState.label).toContain("Warning");
    expect(body.readableState.description).toContain(String(body.strikeCount));
    expect(body.readableState.action).toBe("Learn more");
    expect(body.readableState.actionLink).toBe("/help/moderation");
  });

  test.skip("[P0] returns readableState for cooldown_1h state with cooldown reference", async ({
    request,
  }) => {
    // THIS TEST WILL FAIL — readableState not returned for cooldown_1h
    // Given a user with 5-9 strikes (cooldown_1h state)
    // When they call getStrikes
    // Then response includes readableState with label containing "cooldown"
    // And description mentions the cooldown time
    const res = await request.get(`${API_BASE}/moderation/strikes`);
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    expect(body).toHaveProperty("readableState");
    expect(body.readableState.label).toContain("cooldown");
    expect(body.readableState.description).toContain("blocked");
    expect(body.readableState.action).toBeNull();
    expect(body.readableState.actionLink).toBeNull();
  });

  test.skip("[P0] returns readableState for cooldown_24h state with flagged_for_review reference", async ({
    request,
  }) => {
    // THIS TEST WILL FAIL — readableState not returned for cooldown_24h
    // Given a user with 10+ strikes (cooldown_24h state, flaggedForReview)
    // When they call getStrikes
    // Then readableState mentions flagged for review
    const res = await request.get(`${API_BASE}/moderation/strikes`);
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    expect(body).toHaveProperty("readableState");
    expect(body.readableState.label).toContain("cooldown");
    expect(body.readableState.description).toContain("flagged");
    expect(body.flaggedForReview).toBe(true);
  });

  test.skip("[P0] returns readableState for suspended state with Contact support", async ({
    request,
  }) => {
    // THIS TEST WILL FAIL — readableState not returned for suspended
    // Given a user whose account is suspended
    // When they call getStrikes
    // Then readableState has action "Contact support" with link "/support"
    const res = await request.get(`${API_BASE}/moderation/strikes`);
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    expect(body).toHaveProperty("readableState");
    expect(body.readableState.label).toContain("suspended");
    expect(body.readableState.action).toBe("Contact support");
    expect(body.readableState.actionLink).toBe("/support");
  });

  test.skip("[P0] returns readableState for banned state with ban reason in description", async ({
    request,
  }) => {
    // THIS TEST WILL FAIL — readableState not returned for banned
    // Given a user whose account is banned
    // When they call getStrikes
    // Then readableState includes the ban reason in the description
    // And has "Contact support" action
    const res = await request.get(`${API_BASE}/moderation/strikes`);
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    expect(body).toHaveProperty("readableState");
    expect(body.readableState.label).toContain("banned");
    expect(body.readableState.description).toBeTruthy();
    expect(body.readableState.action).toBe("Contact support");
    expect(body.readableState.actionLink).toBe("/support");
  });

  // =========================================================================
  // AC11: Flagged for review indicator
  // Priority: P0
  // =========================================================================

  test.skip("[P0] returns flaggedForReview true when user is flagged", async ({
    request,
  }) => {
    // THIS TEST WILL FAIL — no user with flaggedForReview in test data
    // Given a user whose userProfile.flaggedForReview = 1
    // When they call getStrikes
    // Then flaggedForReview is true
    const res = await request.get(`${API_BASE}/moderation/strikes`);
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    expect(body.flaggedForReview).toBe(true);
  });

  // =========================================================================
  // AC9: Cooldown countdown related — cooldownUntil is an ISO timestamp
  // Priority: P1
  // =========================================================================

  test.skip("[P1] cooldownUntil is a valid ISO timestamp when in cooldown state", async ({
    request,
  }) => {
    // THIS TEST WILL FAIL — no seeded cooldown state
    // Given a user in cooldown_1h or cooldown_24h state
    // When they call getStrikes
    // Then cooldownUntil is a non-null ISO date string
    const res = await request.get(`${API_BASE}/moderation/strikes`);
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    expect(body.cooldownUntil).toBeTruthy();
    expect(() => new Date(body.cooldownUntil)).not.toThrow();
    expect(new Date(body.cooldownUntil).getTime()).toBeGreaterThan(Date.now());
  });

  test.skip("[P1] cooldownUntil is null when not in a cooldown state", async ({
    request,
  }) => {
    // THIS TEST WILL FAIL — no seeded clean state
    // Given a user in clean or warned state
    // When they call getStrikes
    // Then cooldownUntil is null
    const res = await request.get(`${API_BASE}/moderation/strikes`);
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    expect(body.cooldownUntil).toBeNull();
  });

  // =========================================================================
  // AC10: API shape — readableState object contract
  // Priority: P1
  // =========================================================================

  test.skip("[P1] readableState has the correct shape for all states", async ({
    request,
  }) => {
    // THIS TEST WILL FAIL — readableState not implemented
    // Given any authenticated user
    // When they call getStrikes
    // Then readableState has exactly these fields: label, description, action, actionLink
    const res = await request.get(`${API_BASE}/moderation/strikes`);
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    expect(body).toHaveProperty("readableState");
    expect(body.readableState).toHaveProperty("label");
    expect(body.readableState).toHaveProperty("description");
    expect(body.readableState).toHaveProperty("action");
    expect(body.readableState).toHaveProperty("actionLink");
    expect(typeof body.readableState.label).toBe("string");
    expect(typeof body.readableState.description).toBe("string");
  });

  test.skip("[P1] getStrikes response still includes all original fields", async ({
    request,
  }) => {
    // THIS TEST WILL FAIL — backward compatibility check
    // Given an authenticated user
    // When they call getStrikes
    // Then all original fields are still present alongside readableState
    const res = await request.get(`${API_BASE}/moderation/strikes`);
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    expect(body).toHaveProperty("strikeCount");
    expect(body).toHaveProperty("state");
    expect(body).toHaveProperty("cooldownUntil");
    expect(body).toHaveProperty("flaggedForReview");
    expect(body).toHaveProperty("readableState");
    expect(typeof body.strikeCount).toBe("number");
    expect(typeof body.state).toBe("string");
  });

  // =========================================================================
  // Auth guard
  // Priority: P1
  // =========================================================================

  test.skip("[P1] rejects unauthenticated request with 401", async ({
    request,
  }) => {
    // THIS TEST WILL FAIL — unauthenticated request handling
    // Given no auth token
    // When getStrikes is called
    // Then 401 Unauthorized is returned
    const res = await request.get(`${API_BASE}/moderation/strikes`);
    expect(res.status()).toBe(401);
  });
});
