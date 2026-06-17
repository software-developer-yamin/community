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
