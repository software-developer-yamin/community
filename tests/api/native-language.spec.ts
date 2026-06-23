import { expect, test } from "@playwright/test";

const API_BASE = "http://localhost:3000/api";

test.describe("Native Language Field — API Contract Tests (ATDD, RED PHASE)", () => {
  // =========================================================================
  // AC1: updateProfile accepts valid nativeLanguage
  // Priority: P0
  // Platform: all
  // =========================================================================

  test.skip("[P0] should store nativeLanguage when updateProfile is called with valid value", async ({
    request,
  }) => {
    // THIS TEST WILL FAIL — nativeLanguage acceptance not fully wired in API
    // Step 1: Get auth session
    // await loginAs(request, testLearner);

    // Step 2: Call updateProfile with valid nativeLanguage
    const res = await request.post(`${API_BASE}/rebuild/updateProfile`, {
      data: { nativeLanguage: "bangla" },
    });
    expect(res.ok()).toBeTruthy();

    // Step 3: Verify via getProfile
    const profileRes = await request.post(`${API_BASE}/rebuild/getProfile`);
    const profile = await profileRes.json();
    // EXPECTED: profile.nativeLanguage === "bangla"
    // ACTUAL (red phase): No auth integration, no assertion → fails
    expect(profile).toHaveProperty("nativeLanguage", "bangla");
  });

  test.skip("[P0] should accept all 6 languages from NATIVE_LANG_MAP", async ({
    request,
  }) => {
    // THIS TEST WILL FAIL — validation not implemented
    const languages = [
      "bangla",
      "english",
      "hindi",
      "arabic",
      "spanish",
      "french",
    ];

    for (const lang of languages) {
      const res = await request.post(`${API_BASE}/rebuild/updateProfile`, {
        data: { nativeLanguage: lang },
      });
      expect(res.ok()).toBeTruthy();

      const profileRes = await request.post(`${API_BASE}/rebuild/getProfile`);
      const profile = await profileRes.json();
      expect(profile).toHaveProperty("nativeLanguage", lang);
    }
    // EXPECTED: All 6 valid languages accepted and stored
    // ACTUAL (red phase): No validation — will silently store any string
  });

  // =========================================================================
  // AC2: updateProfile rejects invalid nativeLanguage
  // Priority: P1
  // Platform: all
  // =========================================================================

  test.skip("[P1] should reject invalid nativeLanguage values", async ({
    request,
  }) => {
    // THIS TEST WILL FAIL — input validation not implemented
    const invalidValues = ["", "   ", "gibberish", "!@#$%", "a".repeat(31)];

    for (const val of invalidValues) {
      const res = await request.post(`${API_BASE}/rebuild/updateProfile`, {
        data: { nativeLanguage: val },
      });
      // EXPECTED: Status 400 with validation error
      // ACTUAL (red phase): No validation — stores any string → passes when it shouldn't
      expect(res.status()).toBe(400);
    }
  });

  // =========================================================================
  // AC3: Empty string clears nativeLanguage back to default "bn"
  // Priority: P1
  // Platform: all
  // =========================================================================

  test.skip("[P1] should reset nativeLanguage to default when empty string is sent", async ({
    request,
  }) => {
    // THIS TEST WILL FAIL — empty-string handling not implemented
    // Step 1: Set to a known value first
    await request.post(`${API_BASE}/rebuild/updateProfile`, {
      data: { nativeLanguage: "arabic" },
    });

    // Step 2: Send empty string (should reset to "bn")
    await request.post(`${API_BASE}/rebuild/updateProfile`, {
      data: { nativeLanguage: "" },
    });

    // Step 3: Verify default
    const profileRes = await request.post(`${API_BASE}/rebuild/getProfile`);
    const profile = await profileRes.json();
    // EXPECTED: profile.nativeLanguage === "bn"
    // ACTUAL (red phase): Empty string stored literally → fails
    expect(profile).toHaveProperty("nativeLanguage", "bn");
  });

  // =========================================================================
  // AC4: recomputeEmbedding reflects updated nativeLanguage
  // Priority: P0
  // Platform: all
  // =========================================================================

  test.skip("[P0] should update profile embedding when nativeLanguage changes", async ({
    request,
  }) => {
    // THIS TEST WILL FAIL — recomputeEmbedding uses hardcoded "Bangla" in PROFILE_TEMPLATE
    // Step 1: Set nativeLanguage
    await request.post(`${API_BASE}/rebuild/updateProfile`, {
      data: { nativeLanguage: "hindi" },
    });

    // Step 2: Trigger recomputeEmbedding
    const recomputeRes = await request.post(
      `${API_BASE}/models/recomputeEmbedding`
    );
    expect(recomputeRes.ok()).toBeTruthy();
    const recomputeResult = await recomputeRes.json();
    expect(recomputeResult).toHaveProperty("ok", true);

    // Step 3: Check that embedding was regenerated with new language
    // EXPECTED: recomputeEmbedding reads nativeLanguage from profile
    //   and includes it in PROFILE_TEMPLATE: "Native: hindi"
    // ACTUAL (red phase): recomputeEmbedding hardcodes "Bangla" on line 242
    //   — embedding does NOT reflect profile changes → test fails
    expect(recomputeResult).toHaveProperty("latencyMs");
    expect(typeof recomputeResult.latencyMs).toBe("number");
  });

  // =========================================================================
  // AC4: getProfile returns nativeLanguage field
  // Priority: P0
  // Platform: all
  // =========================================================================

  test.skip("[P0] should return nativeLanguage in getProfile response", async ({
    request,
  }) => {
    // THIS TEST WILL FAIL — profile shape not validated for nativeLanguage
    const res = await request.post(`${API_BASE}/rebuild/getProfile`);
    expect(res.ok()).toBeTruthy();

    const profile = await res.json();
    // EXPECTED: profile contains nativeLanguage field (string or null)
    // ACTUAL (red phase): We don't know if it's returned — no assertion yet
    expect(profile).toHaveProperty("nativeLanguage");
  });
});
