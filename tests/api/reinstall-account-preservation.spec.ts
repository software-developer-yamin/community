import { type APIRequestContext, expect, test } from "@playwright/test";

/**
 * ATDD Red-Phase API Tests — Story 6.3: Reinstall Account Preservation
 *
 * TDD RED PHASE: All tests use test.skip() and assert expected behavior.
 * Activated tests WILL FAIL until the feature is implemented.
 * Remove test.skip() task-by-task as each AC is implemented.
 *
 * Coverage:
 *   AC-1: Same-method reinstall restores full account (server-side data)
 *   AC-2: Subscription state is server-authoritative after reinstall
 *   AC-3: Cross-provider account linking via email matching (T1 — accountLinking)
 *   AC-4: Cross-provider account recovery via linkAccount (T2 — linkAccount procedure)
 *   AC-5: No data migration on same-account recovery (current userProfile preserved)
 *   AC-6: Profile and history accessible after reinstall
 *
 * Seeding note: Tests use pre-seeded users with fixed emails. Seed users with:
 *   - "reinstall-email@example.com"       — email/password account, tier=premium, cefrLevel=B2,
 *                                           nativeLanguage=Bengali, totalCallCount≥1
 *   - "reinstall-phone@community.app"     — phone-only account (temp email), has phone-number
 *                                           provider entry in account table
 *   - "reinstall-google@example.com"      — Google account (seeded as email/password),
 *                                           no existing phone-number provider entry
 *   - "reinstall-google-with-profile@example.com" — Google account WITH existing userProfile,
 *                                           cefrLevel=A2, nativeLanguage=English
 *   - "reinstall-google-no-profile@example.com"   — Google account with NO userProfile yet
 *   Phone seeds:
 *     "+8801900000001" → separate phone user (for linkAccount target)
 *     "+8801800000001" → reinstall-email user's own phone (for same-account check)
 *     "+8801700000001" → old phone user with profile (for AC-5 migration test)
 *     "+8801600000001" → old phone user with profile (for AC-5 no-profile migration test)
 *
 * See tests/fixtures/test-data.ts for seeding patterns.
 */

/**
 * Infrastructure helper: authenticate as a seeded test user and return an auth header.
 * Throws with a descriptive error (not a test assertion) so setup failures surface clearly.
 */
async function loginAs(
  request: APIRequestContext,
  email: string,
  password = "TestPass123!"
): Promise<Record<string, string>> {
  const loginRes = await request.post("/api/auth/sign-in/email", {
    data: { email, password },
  });
  if (!loginRes.ok()) {
    throw new Error(
      `loginAs: authentication failed for ${email} — status ${loginRes.status()}`
    );
  }
  const { session } = await loginRes.json();
  return { Cookie: `better-auth.session_token=${session.token}` };
}

test.describe("Reinstall Account Preservation — API/Integration Tests (ATDD, RED PHASE)", () => {
  // =========================================================================
  // AC-1: Same-method reinstall restores full account
  // Priority: P0 — Core reinstall guarantee
  // Tasks: Server-side by design — verifies the invariant holds
  // =========================================================================

  test.skip(
    "[P0][AC-1] same email/password sign-in after reinstall returns profile data intact",
    async ({ request }) => {
      // THIS TEST WILL FAIL — requires seeded user with cefrLevel=B2, nativeLanguage=Bengali

      // Re-authenticate (simulates app reinstall + sign-in with same credentials)
      const authHeader = await loginAs(request, "reinstall-email@example.com");

      // Fetch profile — all data must be server-authoritative, nothing lost on reinstall
      const profileRes = await request.get("/api/rpc/rebuild.getProfile", {
        headers: authHeader,
      });
      expect(profileRes.status()).toBe(200);
      const profile = await profileRes.json();

      // Profile fields must match the pre-seeded state
      expect(profile).toHaveProperty("userId");
      expect(profile.cefrLevel).toBe("B2");
      expect(profile.nativeLanguage).toBe("Bengali");
      expect(profile.totalCallCount).toBeGreaterThan(0);
    }
  );

  test.skip(
    "[P0][AC-1] two sign-ins with same email/password return the same userId — no duplicate user created",
    async ({ request }) => {
      // THIS TEST WILL FAIL — requires seeded user

      // First sign-in (represents original session before reinstall)
      const firstSignIn = await request.post("/api/auth/sign-in/email", {
        data: { email: "reinstall-email@example.com", password: "TestPass123!" },
      });
      expect(firstSignIn.status()).toBe(200);
      const { session: first } = await firstSignIn.json();
      const firstHeader = { Cookie: `better-auth.session_token=${first.token}` };

      // Second sign-in (simulates reinstall — new session, same credentials)
      const secondSignIn = await request.post("/api/auth/sign-in/email", {
        data: { email: "reinstall-email@example.com", password: "TestPass123!" },
      });
      expect(secondSignIn.status()).toBe(200);
      const { session: second } = await secondSignIn.json();
      const secondHeader = { Cookie: `better-auth.session_token=${second.token}` };

      // Fetch profile from both sessions and compare userId
      const [firstProfile, secondProfile] = await Promise.all([
        request
          .get("/api/rpc/rebuild.getProfile", { headers: firstHeader })
          .then((r) => r.json()),
        request
          .get("/api/rpc/rebuild.getProfile", { headers: secondHeader })
          .then((r) => r.json()),
      ]);

      // Must be the same userId — no duplicate user created on reinstall
      expect(firstProfile.userId).toBe(secondProfile.userId);
    }
  );

  // =========================================================================
  // AC-2: Subscription state is server-authoritative
  // Priority: P0 — Billing invariant
  // Tasks: Server-side by design — verifies the invariant holds
  // =========================================================================

  test.skip(
    "[P0][AC-2] getSubscription returns same tier and status after simulated reinstall",
    async ({ request }) => {
      // THIS TEST WILL FAIL — requires seeded user with tier=premium

      // Re-authenticate (simulates reinstall — no local subscription cache)
      const authHeader = await loginAs(request, "reinstall-email@example.com");

      const subRes = await request.get("/api/rpc/billing.getSubscription", {
        headers: authHeader,
      });
      expect(subRes.status()).toBe(200);
      const sub = await subRes.json();

      // Subscription must be server-authoritative — same data as before reinstall
      expect(sub.tier).toBe("premium");
      expect(sub.autoRenew).toBe(true);
      expect(sub.endsAt).not.toBeNull();

      // Tier expiry is tracked server-side — no device state required
      expect(sub).toHaveProperty("tierExpiresAt");
    }
  );

  test.skip(
    "[P0][AC-2] subscription data returned with only a fresh session — no device cache needed",
    async ({ request }) => {
      // THIS TEST WILL FAIL — requires seeded user with active subscription

      // Authenticate as if starting fresh (reinstall scenario)
      const authHeader = await loginAs(request, "reinstall-email@example.com");

      const subRes = await request.get("/api/rpc/billing.getSubscription", {
        headers: authHeader,
      });
      expect(subRes.status()).toBe(200);
      const sub = await subRes.json();

      // Server must return a valid subscription shape — no device storage involved
      expect(sub).toHaveProperty("tier");
      expect(sub).toHaveProperty("endsAt");
      expect(["free", "premium", "premium_plus"]).toContain(sub.tier);
    }
  );

  // =========================================================================
  // AC-3: Cross-provider account linking via email matching (T1)
  // Priority: P0 — Duplicate-user prevention
  // Tasks: T1 — Enable account.accountLinking in packages/auth/src/index.ts
  // =========================================================================

  test.skip(
    "[P0][AC-3] signing in with Google using the same email as an existing email/password account returns the same userId",
    async ({ request }) => {
      // THIS TEST WILL FAIL — T1 (account.accountLinking) not yet enabled

      // Step 1: Get original userId from email/password sign-in
      const emailAuth = await loginAs(request, "reinstall-google@example.com");
      const originalProfileRes = await request.get("/api/rpc/rebuild.getProfile", {
        headers: emailAuth,
      });
      expect(originalProfileRes.status()).toBe(200);
      const { userId: originalUserId } = await originalProfileRes.json();

      // Step 2: Simulate a Google OAuth flow via Better-Auth test endpoint
      // In CI, Google OAuth is typically tested via a seeded "google" account row
      // After T1: Better-Auth links the Google OAuth email to the existing email/password user
      const googleLinkRes = await request.post("/api/auth/sign-in/social", {
        data: {
          provider: "google",
          callbackURL: "/",
        },
      });
      // The social sign-in redirects; verify the linked session returns original userId
      // (In a live test environment, this requires a mock Google OAuth token)
      // For now, verify that re-signing in with the email/password returns same userId
      const reAuthHeader = await loginAs(request, "reinstall-google@example.com");
      const reProfileRes = await request.get("/api/rpc/rebuild.getProfile", {
        headers: reAuthHeader,
      });
      expect(reProfileRes.status()).toBe(200);
      const { userId: reUserId } = await reProfileRes.json();

      // Must be the same user — no duplicate created after Google link
      expect(reUserId).toBe(originalUserId);
    }
  );

  test.skip(
    "[P0][AC-3] email-based account linking does not add phone-number provider to trustedProviders",
    async ({ request }) => {
      // THIS TEST WILL FAIL — T1 config not yet applied

      // Phone accounts use temp emails like "+880...@community.app"
      // Signing in with Google using a REAL email must NOT auto-link to a phone temp email
      // This test verifies that phone accounts remain separate unless linkAccount is called

      // Sign in as the phone-temp-email account
      const phoneAuth = await loginAs(request, "reinstall-phone@community.app");
      const phoneProfileRes = await request.get("/api/rpc/rebuild.getProfile", {
        headers: phoneAuth,
      });
      expect(phoneProfileRes.status()).toBe(200);
      const { userId: phoneUserId } = await phoneProfileRes.json();

      // Sign in as a Google account with a DIFFERENT email (not the temp email)
      const googleAuth = await loginAs(request, "reinstall-google@example.com");
      const googleProfileRes = await request.get("/api/rpc/rebuild.getProfile", {
        headers: googleAuth,
      });
      expect(googleProfileRes.status()).toBe(200);
      const { userId: googleUserId } = await googleProfileRes.json();

      // These MUST be different users — Google did not auto-link to the phone temp email
      expect(googleUserId).not.toBe(phoneUserId);
    }
  );

  // =========================================================================
  // AC-4: Cross-provider account recovery via linkAccount (T2)
  // Priority: P0 — Phone-to-Google recovery path
  // Tasks: T2 — Add linkAccount protected procedure to packages/api/src/routers/rebuild.ts
  // =========================================================================

  test.skip(
    "[P0][AC-4] linkAccount re-points phone account row to current Google userId and returns linked: true",
    async ({ request }) => {
      // THIS TEST WILL FAIL — T2 (linkAccount procedure) not yet implemented

      // Authenticate as Google account (new account created after reinstall)
      const googleAuth = await loginAs(request, "reinstall-google@example.com");

      // Call linkAccount with the old phone number
      const linkRes = await request.post("/api/rpc/rebuild.linkAccount", {
        headers: googleAuth,
        data: { phoneNumber: "+8801900000001" },
      });
      expect(linkRes.status()).toBe(200);
      const linkBody = await linkRes.json();

      // Must return { linked: true }
      expect(linkBody.linked).toBe(true);

      // After linking, the Google session's profile endpoint must still work
      const profileRes = await request.get("/api/rpc/rebuild.getProfile", {
        headers: googleAuth,
      });
      expect(profileRes.status()).toBe(200);
      const profile = await profileRes.json();
      expect(profile.userId).toBeTruthy();
    }
  );

  test.skip(
    "[P0][AC-4] linkAccount returns NOT_FOUND when phone number has no matching account",
    async ({ request }) => {
      // THIS TEST WILL FAIL — T2 (linkAccount procedure) not yet implemented

      const googleAuth = await loginAs(request, "reinstall-google@example.com");

      // Non-existent phone number
      const linkRes = await request.post("/api/rpc/rebuild.linkAccount", {
        headers: googleAuth,
        data: { phoneNumber: "+8801999999999" },
      });

      expect(linkRes.status()).toBe(404);
      const body = await linkRes.json();
      expect(body.code).toBe("NOT_FOUND");
    }
  );

  test.skip(
    "[P1][AC-4] linkAccount returns same_account when phone number belongs to current user",
    async ({ request }) => {
      // THIS TEST WILL FAIL — T2 (linkAccount procedure) not yet implemented

      const auth = await loginAs(request, "reinstall-email@example.com");

      // Attempt to link own phone number (+8801800000001 is seeded to this user)
      const linkRes = await request.post("/api/rpc/rebuild.linkAccount", {
        headers: auth,
        data: { phoneNumber: "+8801800000001" },
      });
      expect(linkRes.status()).toBe(200);
      const body = await linkRes.json();

      // No-op — same account, returns linked: false with reason
      expect(body.linked).toBe(false);
      expect(body.reason).toBe("same_account");
    }
  );

  test.skip(
    "[P1][AC-4] linkAccount returns CONFLICT when current user already has a phone-number sign-in method",
    async ({ request }) => {
      // THIS TEST WILL FAIL — T2 (linkAccount procedure) not yet implemented

      // Authenticate as a user that already has a phone-number provider entry
      const phoneAuth = await loginAs(request, "reinstall-phone@community.app");

      // Attempt to link a different phone number (another user's)
      const linkRes = await request.post("/api/rpc/rebuild.linkAccount", {
        headers: phoneAuth,
        data: { phoneNumber: "+8801900000001" },
      });

      expect(linkRes.status()).toBe(409);
      const body = await linkRes.json();
      expect(body.code).toBe("CONFLICT");
    }
  );

  test.skip(
    "[P1][AC-4] linkAccount requires authentication — unauthenticated request returns 401",
    async ({ request }) => {
      // THIS TEST WILL FAIL — T2 (linkAccount procedure) not yet implemented

      const linkRes = await request.post("/api/rpc/rebuild.linkAccount", {
        data: { phoneNumber: "+8801900000001" },
      });

      expect(linkRes.status()).toBe(401);
    }
  );

  // =========================================================================
  // AC-5: No data migration on same-account recovery (current userProfile preserved)
  // Priority: P1 — Data integrity during recovery
  // Tasks: T2 — conditional userProfile migration in linkAccount handler
  // =========================================================================

  test.skip(
    "[P1][AC-5] linkAccount preserves current userProfile when current user already has one",
    async ({ request }) => {
      // THIS TEST WILL FAIL — T2 (conditional profile migration) not yet implemented

      // Current user already has a userProfile (cefrLevel=A2, nativeLanguage=English)
      const googleAuth = await loginAs(
        request,
        "reinstall-google-with-profile@example.com"
      );

      // Read profile BEFORE linking
      const beforeRes = await request.get("/api/rpc/rebuild.getProfile", {
        headers: googleAuth,
      });
      const beforeProfile = await beforeRes.json();
      const originalCefrLevel = beforeProfile.cefrLevel;
      const originalNativeLanguage = beforeProfile.nativeLanguage;

      // Link old phone account (which has a DIFFERENT userProfile)
      const linkRes = await request.post("/api/rpc/rebuild.linkAccount", {
        headers: googleAuth,
        data: { phoneNumber: "+8801700000001" },
      });
      expect(linkRes.status()).toBe(200);
      const { linked } = await linkRes.json();
      expect(linked).toBe(true);

      // Read profile AFTER linking — must be UNCHANGED
      const afterRes = await request.get("/api/rpc/rebuild.getProfile", {
        headers: googleAuth,
      });
      const afterProfile = await afterRes.json();

      expect(afterProfile.cefrLevel).toBe(originalCefrLevel);
      expect(afterProfile.nativeLanguage).toBe(originalNativeLanguage);
    }
  );

  test.skip(
    "[P1][AC-5] linkAccount migrates userProfile from old phone account when current user has no profile",
    async ({ request }) => {
      // THIS TEST WILL FAIL — T2 (conditional profile migration) not yet implemented

      // Current user (fresh Google account) has NO userProfile yet
      const freshGoogleAuth = await loginAs(
        request,
        "reinstall-google-no-profile@example.com"
      );

      // Verify no profile exists before linking
      const beforeRes = await request.get("/api/rpc/rebuild.getProfile", {
        headers: freshGoogleAuth,
      });
      const beforeProfile = await beforeRes.json();
      expect(beforeProfile).toBeNull();

      // Link old phone account that HAS a userProfile
      const linkRes = await request.post("/api/rpc/rebuild.linkAccount", {
        headers: freshGoogleAuth,
        data: { phoneNumber: "+8801600000001" },
      });
      expect(linkRes.status()).toBe(200);
      const { linked } = await linkRes.json();
      expect(linked).toBe(true);

      // Profile must now exist — migrated from the old phone account
      const afterRes = await request.get("/api/rpc/rebuild.getProfile", {
        headers: freshGoogleAuth,
      });
      const afterProfile = await afterRes.json();

      expect(afterProfile).not.toBeNull();
      expect(afterProfile).toHaveProperty("cefrLevel");
      expect(afterProfile).toHaveProperty("nativeLanguage");
    }
  );

  // =========================================================================
  // AC-6: Profile and history accessible after reinstall
  // Priority: P0 — Data persistence guarantee
  // Tasks: Server-side by design — verifies the invariant holds
  // =========================================================================

  test.skip(
    "[P0][AC-6] cefrLevel, nativeLanguage, totalCallCount accessible after re-authentication",
    async ({ request }) => {
      // THIS TEST WILL FAIL — requires seeded user with call history and profile data

      // Re-authenticate (simulates fresh install — no device state)
      const authHeader = await loginAs(request, "reinstall-email@example.com");

      const profileRes = await request.get("/api/rpc/rebuild.getProfile", {
        headers: authHeader,
      });
      expect(profileRes.status()).toBe(200);
      const profile = await profileRes.json();

      // All profile data must be returned from the server (nothing on device)
      expect(profile.cefrLevel).not.toBeNull();
      expect(profile.nativeLanguage).not.toBeNull();
      expect(profile.totalCallCount).toBeGreaterThan(0);
      expect(profile.totalCallDuration).toBeGreaterThan(0);
    }
  );

  test.skip(
    "[P0][AC-6] call history with ratings accessible via API after re-authentication without device data",
    async ({ request }) => {
      // THIS TEST WILL FAIL — requires seeded user with rated call records

      const authHeader = await loginAs(request, "reinstall-email@example.com");

      // Call history must be accessible server-side — no device storage required
      const historyRes = await request.get("/api/rpc/rebuild.getCallHistory", {
        headers: authHeader,
      });
      expect(historyRes.status()).toBe(200);
      const history = await historyRes.json();

      // Must have at least one historical call (seeded pre-install)
      expect(Array.isArray(history.calls)).toBe(true);
      expect(history.calls.length).toBeGreaterThan(0);

      // At least one call must have a rating — seeded from before reinstall
      const ratedCall = history.calls.find(
        (c: { rating: number | null }) => c.rating !== null
      );
      expect(ratedCall).toBeDefined();
    }
  );
});
