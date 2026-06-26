import { expect, test } from "@playwright/test";

/**
 * ATDD Red-Phase API Tests — Story 5.5: Cancellation Preserves Access Until Period End
 *
 * TDD RED PHASE: All tests use test.skip() and assert expected behavior.
 * Activated tests WILL FAIL until the feature is implemented.
 * Remove test.skip() task-by-task as each AC is implemented.
 *
 * Coverage:
 *   AC-1: Cancellation preserves access to paid features
 *   AC-2: Lazy expiration check via getEffectiveTier
 *   AC-3: Auto-renew re-enable within paid period
 *   AC-4: Periodic tier cleanup via startTierCleanup (T3 registration)
 *   AC-5: Gender preference enforcement rejects expired premium_plus
 *   AC-6: Gender preference enforcement allows access during valid period
 */

test.describe("Cancellation Preserves Access — API/Integration Tests (ATDD, RED PHASE)", () => {
  // =========================================================================
  // AC-1: Cancellation preserves access to paid features
  // Priority: P0 — Core subscription invariant
  // Tasks: T4 (tierExpiresAt sync in toggleAutoRenew)
  // =========================================================================

  test.skip(
    "[P0][AC-1] toggleAutoRenew OFF: autoRenew set to 0 while tier and tierExpiresAt remain unchanged",
    async ({ request }) => {
      // THIS TEST WILL FAIL — T4 (tierExpiresAt sync) not yet implemented

      // 1. Authenticate as a premium user
      const loginRes = await request.post("/api/auth/sign-in/email", {
        data: {
          email: "premium-user@example.com",
          password: "TestPass123!",
        },
      });
      expect(loginRes.status()).toBe(200);
      const { session } = await loginRes.json();
      const authHeader = { Cookie: `better-auth.session_token=${session.token}` };

      // 2. Read current subscription state (autoRenew = 1, tier = "premium")
      const beforeRes = await request.get("/api/rpc/billing.getSubscription", {
        headers: authHeader,
      });
      expect(beforeRes.status()).toBe(200);
      const before = await beforeRes.json();
      expect(before.autoRenew).toBe(1);
      const originalTier = before.tier;
      const originalEndsAt = before.endsAt;

      // 3. Toggle auto-renew OFF (cancel)
      const cancelRes = await request.post("/api/rpc/billing.toggleAutoRenew", {
        headers: authHeader,
        data: {},
      });
      expect(cancelRes.status()).toBe(200);
      const cancelBody = await cancelRes.json();

      // autoRenew must be 0 now
      expect(cancelBody.autoRenew).toBe(0);

      // Tier must be unchanged — still "premium" (or whatever it was)
      expect(cancelBody.tier).toBe(originalTier);

      // isCancelled must be true (T5 field)
      expect(cancelBody.isCancelled).toBe(true);

      // willExpireOn must equal endsAt (T5 field)
      expect(cancelBody.willExpireOn).toBe(originalEndsAt);

      // tierExpiresAt must be set and equal to endsAt (T4 + T5)
      expect(cancelBody.tierExpiresAt).not.toBeNull();
      expect(cancelBody.tierExpiresAt).toBe(originalEndsAt);
    }
  );

  test.skip(
    "[P0][AC-1] paid features remain accessible immediately after cancellation",
    async ({ request }) => {
      // THIS TEST WILL FAIL — lazy downgrade depends on tierExpiresAt being set (T4)

      const loginRes = await request.post("/api/auth/sign-in/email", {
        data: { email: "cancelled-premium@example.com", password: "TestPass123!" },
      });
      expect(loginRes.status()).toBe(200);
      const { session } = await loginRes.json();
      const authHeader = { Cookie: `better-auth.session_token=${session.token}` };

      // Cancel subscription
      await request.post("/api/rpc/billing.toggleAutoRenew", {
        headers: authHeader,
        data: {},
      });

      // Immediately after cancel — gender preference update should still succeed
      // because tierExpiresAt is still in the future
      const prefRes = await request.post("/api/rpc/models.updateProfile", {
        headers: authHeader,
        data: { genderPreference: "female" },
      });
      expect(prefRes.status()).toBe(200);
    }
  );

  // =========================================================================
  // AC-2: Lazy expiration check
  // Priority: P0 — Feature gate correctness
  // Tasks: T1/T2 already implemented — this test documents expected behavior
  // =========================================================================

  test.skip(
    "[P0][AC-2] getEffectiveTier returns 'free' when tierExpiresAt is in the past",
    async ({ request }) => {
      // THIS TEST WILL FAIL — requires test DB seeding with expired tier row

      // Seed: user with tier="premium", tierExpiresAt = yesterday
      // This tests the computeEffectiveTier / getEffectiveTier logic directly via API
      const loginRes = await request.post("/api/auth/sign-in/email", {
        data: { email: "expired-premium@example.com", password: "TestPass123!" },
      });
      expect(loginRes.status()).toBe(200);
      const { session } = await loginRes.json();
      const authHeader = { Cookie: `better-auth.session_token=${session.token}` };

      // Try to use a premium_plus-only feature (gender preference)
      // User has tier="premium_plus" but tierExpiresAt is in the past
      const prefRes = await request.post("/api/rpc/models.updateProfile", {
        headers: authHeader,
        data: { genderPreference: "female" },
      });

      // Must be rejected — effectiveTier is "free"
      expect(prefRes.status()).toBe(403);
      const body = await prefRes.json();
      expect(body.code).toBe("FORBIDDEN");
    }
  );

  test.skip(
    "[P0][AC-2] getEffectiveTier lazily downgrades userProfile tier when tierExpiresAt has passed",
    async ({ request }) => {
      // THIS TEST WILL FAIL — requires test DB seeding with expired tier row

      const loginRes = await request.post("/api/auth/sign-in/email", {
        data: { email: "expired-premium@example.com", password: "TestPass123!" },
      });
      expect(loginRes.status()).toBe(200);
      const { session } = await loginRes.json();
      const authHeader = { Cookie: `better-auth.session_token=${session.token}` };

      // Trigger lazy downgrade by hitting any feature-gated endpoint
      await request.post("/api/rpc/models.updateProfile", {
        headers: authHeader,
        data: { genderPreference: "female" },
      });

      // Read subscription state — tier must now be "free" (lazy downgrade applied)
      const subRes = await request.get("/api/rpc/billing.getSubscription", {
        headers: authHeader,
      });
      expect(subRes.status()).toBe(200);
      const sub = await subRes.json();
      expect(sub.tier).toBe("free");
    }
  );

  // =========================================================================
  // AC-3: Auto-renew re-enable within paid period
  // Priority: P1 — Reversibility guarantee
  // Tasks: toggleAutoRenew ON path
  // =========================================================================

  test.skip(
    "[P1][AC-3] toggleAutoRenew ON: autoRenew set back to 1 without disrupting tier",
    async ({ request }) => {
      // THIS TEST WILL FAIL — full toggle round-trip not verified yet

      const loginRes = await request.post("/api/auth/sign-in/email", {
        data: { email: "cancelled-premium@example.com", password: "TestPass123!" },
      });
      expect(loginRes.status()).toBe(200);
      const { session } = await loginRes.json();
      const authHeader = { Cookie: `better-auth.session_token=${session.token}` };

      // First, cancel
      await request.post("/api/rpc/billing.toggleAutoRenew", {
        headers: authHeader,
        data: {},
      });

      // Then re-enable
      const reEnableRes = await request.post("/api/rpc/billing.toggleAutoRenew", {
        headers: authHeader,
        data: {},
      });
      expect(reEnableRes.status()).toBe(200);
      const reEnableBody = await reEnableRes.json();

      expect(reEnableBody.autoRenew).toBe(1);
      // isCancelled must be false again (T5 field)
      expect(reEnableBody.isCancelled).toBe(false);
      // willExpireOn must be null when autoRenew is on (T5 field)
      expect(reEnableBody.willExpireOn).toBeNull();
      // tier must still be premium
      expect(reEnableBody.tier).not.toBe("free");
    }
  );

  // =========================================================================
  // AC-4: Periodic tier cleanup (startTierCleanup registration — T3)
  // Priority: P1 — Background cleanup correctness
  // Tasks: T3 — register startTierCleanup in apps/server/src/index.ts
  // =========================================================================

  test.skip(
    "[P1][AC-4] GET /api/rpc/billing.getSubscription returns free tier after tierExpiresAt has passed and cleanup ran",
    async ({ request }) => {
      // THIS TEST WILL FAIL — requires test DB with past tierExpiresAt + cleanup trigger

      // Seed: user with tier="premium", tierExpiresAt = 1 hour ago
      // After cleanup runs, userProfile.tier should be "free" and tierExpiresAt = null

      const loginRes = await request.post("/api/auth/sign-in/email", {
        data: { email: "cleanup-target@example.com", password: "TestPass123!" },
      });
      expect(loginRes.status()).toBe(200);
      const { session } = await loginRes.json();
      const authHeader = { Cookie: `better-auth.session_token=${session.token}` };

      // Trigger cleanup via a test endpoint (or rely on lazy downgrade path)
      const subRes = await request.get("/api/rpc/billing.getSubscription", {
        headers: authHeader,
      });
      expect(subRes.status()).toBe(200);
      const sub = await subRes.json();

      expect(sub.tier).toBe("free");
      expect(sub.tierExpiresAt).toBeNull();
    }
  );

  // =========================================================================
  // AC-5: Gender preference enforcement rejects expired premium_plus user
  // Priority: P0 — Feature gate enforcement
  // Tasks: AC-5 already implemented via T1/T2, but needs verified via ATDD
  // =========================================================================

  test.skip(
    "[P0][AC-5] updateProfile rejects gender preference change when premium_plus tierExpiresAt has passed",
    async ({ request }) => {
      // THIS TEST WILL FAIL — requires test DB seeding with expired premium_plus user

      const loginRes = await request.post("/api/auth/sign-in/email", {
        data: { email: "expired-pplus@example.com", password: "TestPass123!" },
      });
      expect(loginRes.status()).toBe(200);
      const { session } = await loginRes.json();
      const authHeader = { Cookie: `better-auth.session_token=${session.token}` };

      const prefRes = await request.post("/api/rpc/models.updateProfile", {
        headers: authHeader,
        data: { genderPreference: "female" },
      });

      // Must be rejected — effectiveTier resolves to "free" even though
      // userProfile.tier might still read "premium_plus" before lazy downgrade
      expect(prefRes.status()).toBe(403);
      const body = await prefRes.json();
      expect(body.code).toBe("FORBIDDEN");
    }
  );

  // =========================================================================
  // AC-6: Gender preference enforcement allows access during valid period
  // Priority: P0 — Correct authorization during paid window
  // Tasks: AC-6 already implemented via T1/T2, but needs ATDD coverage
  // =========================================================================

  test.skip(
    "[P0][AC-6] updateProfile allows gender preference change for cancelled user still within paid window",
    async ({ request }) => {
      // THIS TEST WILL FAIL — requires test DB with autoRenew=0, tierExpiresAt in future

      const loginRes = await request.post("/api/auth/sign-in/email", {
        data: { email: "cancelled-within-window@example.com", password: "TestPass123!" },
      });
      expect(loginRes.status()).toBe(200);
      const { session } = await loginRes.json();
      const authHeader = { Cookie: `better-auth.session_token=${session.token}` };

      // Cancel subscription (autoRenew = 0) — tierExpiresAt is still in the future
      await request.post("/api/rpc/billing.toggleAutoRenew", {
        headers: authHeader,
        data: {},
      });

      // Gender preference update must succeed — still in paid window
      const prefRes = await request.post("/api/rpc/models.updateProfile", {
        headers: authHeader,
        data: { genderPreference: "female" },
      });
      expect(prefRes.status()).toBe(200);
    }
  );

  // =========================================================================
  // T5: SubscriptionDetail type fields — getSubscription response shape
  // Priority: P1 — API contract for UI consumption
  // Tasks: T5, T6
  // =========================================================================

  test.skip(
    "[P1][T5/T6] getSubscription includes tierExpiresAt, isCancelled, willExpireOn fields",
    async ({ request }) => {
      // THIS TEST WILL FAIL — T5/T6 fields not yet added to formatSubscriptionDetail

      const loginRes = await request.post("/api/auth/sign-in/email", {
        data: { email: "premium-user@example.com", password: "TestPass123!" },
      });
      expect(loginRes.status()).toBe(200);
      const { session } = await loginRes.json();
      const authHeader = { Cookie: `better-auth.session_token=${session.token}` };

      const subRes = await request.get("/api/rpc/billing.getSubscription", {
        headers: authHeader,
      });
      expect(subRes.status()).toBe(200);
      const sub = await subRes.json();

      // T5 fields must be present
      expect(sub).toHaveProperty("tierExpiresAt");
      expect(sub).toHaveProperty("isCancelled");
      expect(sub).toHaveProperty("willExpireOn");

      // For an active (autoRenew = 1) subscription:
      expect(sub.isCancelled).toBe(false);
      expect(sub.willExpireOn).toBeNull();
      // tierExpiresAt is the endsAt value
      expect(typeof sub.tierExpiresAt === "string" || sub.tierExpiresAt === null).toBe(true);
    }
  );

  test.skip(
    "[P1][T5/T6] getSubscription returns isCancelled=true and willExpireOn=endsAt after cancellation",
    async ({ request }) => {
      // THIS TEST WILL FAIL — T5/T6 fields not yet added to formatSubscriptionDetail

      const loginRes = await request.post("/api/auth/sign-in/email", {
        data: { email: "cancelled-premium@example.com", password: "TestPass123!" },
      });
      expect(loginRes.status()).toBe(200);
      const { session } = await loginRes.json();
      const authHeader = { Cookie: `better-auth.session_token=${session.token}` };

      // Cancel
      await request.post("/api/rpc/billing.toggleAutoRenew", {
        headers: authHeader,
        data: {},
      });

      // Read updated subscription
      const subRes = await request.get("/api/rpc/billing.getSubscription", {
        headers: authHeader,
      });
      expect(subRes.status()).toBe(200);
      const sub = await subRes.json();

      expect(sub.isCancelled).toBe(true);
      expect(sub.willExpireOn).not.toBeNull();
      // willExpireOn equals endsAt
      expect(sub.willExpireOn).toBe(sub.endsAt);
      // tierExpiresAt equals endsAt
      expect(sub.tierExpiresAt).toBe(sub.endsAt);
    }
  );

  test.skip(
    "[P1][T5] free plan subscription returns null/false values for new fields",
    async ({ request }) => {
      // THIS TEST WILL FAIL — T5 free plan branch in formatSubscriptionDetail not updated

      const loginRes = await request.post("/api/auth/sign-in/email", {
        data: { email: "free-user@example.com", password: "TestPass123!" },
      });
      expect(loginRes.status()).toBe(200);
      const { session } = await loginRes.json();
      const authHeader = { Cookie: `better-auth.session_token=${session.token}` };

      const subRes = await request.get("/api/rpc/billing.getSubscription", {
        headers: authHeader,
      });
      expect(subRes.status()).toBe(200);
      const sub = await subRes.json();

      // Free plan defaults
      expect(sub.tierExpiresAt).toBeNull();
      expect(sub.isCancelled).toBe(false);
      expect(sub.willExpireOn).toBeNull();
    }
  );
});
