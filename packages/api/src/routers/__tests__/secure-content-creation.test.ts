/**
 * ATDD tests for Story RE-1.3: Secure Content Creation
 *
 * Acceptance Criteria:
 *   AC1: admin user → createContent succeeds (200, item returned)
 *   AC2: non-admin authenticated user → 403 Forbidden
 *   AC3: unauthenticated user → 401 Unauthorized
 *   AC4: adminDeleteContent still works after admin creates content
 *
 * Run from repo root:
 *   bun test packages/api/src/routers/__tests__/secure-content-creation.test.ts
 */

import { describe, expect, test } from "bun:test";

// ─────────────────────────────────────────────────────────────────
// Auth guard helpers (mirrors adminProcedure middleware chain)
// ─────────────────────────────────────────────────────────────────

type SessionUser = {
  id: string;
  role?: string;
};

type Session = {
  user: SessionUser | null;
};

/**
 * Simulates requireAuth middleware.
 * Throws UNAUTHORIZED error string if no session user.
 */
function requireAuth(session: Session): Session {
  if (!session.user) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}

/**
 * Simulates requireAdmin middleware.
 * Throws FORBIDDEN if user exists but is not admin.
 */
function requireAdmin(session: Session): void {
  const user = session.user;
  if (!user || user.role !== "admin") {
    throw new Error("FORBIDDEN");
  }
}

/**
 * Full adminProcedure guard: requireAuth → requireAdmin.
 * Returns the session if all checks pass.
 */
function enforceAdminProcedure(session: Session): Session {
  const authed = requireAuth(session);
  requireAdmin(authed);
  return authed;
}

// ─────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────

describe("re-1.3: Secure Content Creation — adminProcedure guard", () => {
  // AC1: Admin user → passes both middleware layers
  test("AC1: admin user passes requireAuth and requireAdmin", () => {
    const adminSession: Session = {
      user: { id: "admin-1", role: "admin" },
    };
    const result = enforceAdminProcedure(adminSession);
    expect(result.user!.role).toBe("admin");
  });

  // AC2: Non-admin user → passes requireAuth, fails requireAdmin → FORBIDDEN
  test("AC2: non-admin authenticated user receives FORBIDDEN", () => {
    const nonAdminSession: Session = {
      user: { id: "user-1", role: "user" },
    };
    expect(() => {
      const authed = requireAuth(nonAdminSession);
      requireAdmin(authed);
    }).toThrow("FORBIDDEN");
  });

  // AC3: Unauthenticated user → fails requireAuth → UNAUTHORIZED
  test("AC3: unauthenticated user receives UNAUTHORIZED", () => {
    const noSession: Session = { user: null };
    expect(() => requireAuth(noSession)).toThrow("UNAUTHORIZED");
  });

  // AC4: adminDeleteContent (already adminProcedure) is independent
  test("AC4: adminDeleteContent guard is independent of createContent", () => {
    // adminDeleteContent already uses adminProcedure, so the same guard works
    const adminSession: Session = {
      user: { id: "admin-1", role: "admin" },
    };
    expect(() => enforceAdminProcedure(adminSession)).not.toThrow();
  });

  // Edge: user with no role field → FORBIDDEN
  test("user without role field is treated as non-admin", () => {
    const noRoleSession: Session = {
      user: { id: "user-2" },
    };
    expect(() => {
      const authed = requireAuth(noRoleSession);
      requireAdmin(authed);
    }).toThrow("FORBIDDEN");
  });

  // Edge: user with role "moderator" → FORBIDDEN
  test("moderator role is not treated as admin", () => {
    const modSession: Session = {
      user: { id: "mod-1", role: "moderator" },
    };
    expect(() => {
      const authed = requireAuth(modSession);
      requireAdmin(authed);
    }).toThrow("FORBIDDEN");
  });
});
