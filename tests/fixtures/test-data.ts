/**
 * ATDD shared test data fixtures — Session Persistence (Story 1.1)
 * RED PHASE: Fixtures are scaffolded but not yet consumed by active tests.
 * These will be expanded during green phase implementation.
 */

export const testLearner = {
  email: "learner@example.com",
  password: "TestPass123!",
  displayName: "Test Learner",
};

export const mockStoredSession = {
  token: "stored-session-token",
  userId: "user-abc-123",
  expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
};

export const mockExpiredSession = {
  token: "invalid-expired-token",
  userId: "user-expired-999",
  expiresAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
};

// =============================================================================
// Story 3.2: Native Language Field — Test Fixtures
// RED PHASE: Fixtures defined but not yet consumed by active tests.
// =============================================================================

/** Valid native language values from NATIVE_LANG_MAP */
export const VALID_NATIVE_LANGUAGES = [
  "bangla",
  "english",
  "hindi",
  "arabic",
  "spanish",
  "french",
] as const;

export type ValidNativeLang = (typeof VALID_NATIVE_LANGUAGES)[number];

/** User with +880 phone number (Bangladesh) for default detection tests */
export const bdPhoneUser = {
  email: "bangladesh-user@example.com",
  password: "TestPass123!",
  displayName: "Bangladesh Test User",
  phoneNumber: "+8801700000001",
};

/** User with non-BD phone number for default detection negative test */
export const nonBDPhoneUser = {
  email: "other-user@example.com",
  password: "TestPass123!",
  displayName: "Other Test User",
  phoneNumber: "+15551234567",
};
