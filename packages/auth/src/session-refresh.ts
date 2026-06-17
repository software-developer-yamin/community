const PROACTIVE_WINDOW_MS = 60_000; // refresh when session is ≤60s from expiry
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 500;

export type RefreshEvent = "refreshing" | "refreshed" | "failed";
export type RefreshListener = (event: RefreshEvent) => void;

export interface SessionRefresherOptions {
  onEvent?: RefreshListener;
}

/**
 * Minimal session type matching what Better-Auth returns.
 */
interface SessionResult {
  session?: {
    expiresAt?: string | Date;
  };
}

/**
 * Minimal auth client interface that both native and web clients satisfy.
 */
export interface AuthClient {
  getSession(): Promise<{ data: SessionResult | null; error?: unknown }>;
  refresh(): Promise<{ data: SessionResult | null; error?: unknown }>;
}

/**
 * Checks if a session token is near expiry and proactively refreshes it.
 *
 * Better-Auth uses session tokens (not short-lived access + refresh tokens).
 * With `updateAge: 86400` on the server, refreshing a session <1 day from
 * expiry extends it. This interceptor handles the proactive call on the
 * client side before any API call would otherwise 401.
 *
 * Returns `true` if a refresh was attempted and succeeded, `false` if no
 * refresh was needed or the session was already expired, and throws after
 * exhausting all retries.
 */
export async function proactiveRefresh(
  client: AuthClient,
  options?: SessionRefresherOptions
): Promise<boolean> {
  const sessionResult = await client.getSession();

  const sessionData = sessionResult.data;
  const expiresAt = sessionData?.session?.expiresAt;

  if (!expiresAt) {
    return false; // no active session, nothing to refresh
  }

  const expiresAtMs = new Date(expiresAt).getTime();
  const nowMs = Date.now();
  const msUntilExpiry = expiresAtMs - nowMs;

  if (msUntilExpiry > PROACTIVE_WINDOW_MS) {
    return false; // session is fresh enough
  }

  // Session is near expiry — attempt proactive refresh
  options?.onEvent?.("refreshing");

  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const refreshed = await client.refresh();

      if (refreshed.data) {
        options?.onEvent?.("refreshed");
        return true;
      }

      // `data` is null/undefined when the session couldn't be refreshed
      // (e.g., the refresh token itself is expired)
      options?.onEvent?.("failed");
      return false;
    } catch (error) {
      lastError = error;

      if (attempt < MAX_RETRIES - 1) {
        const delay = BASE_DELAY_MS * 2 ** attempt;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  options?.onEvent?.("failed");
  throw lastError ?? new Error("Session refresh failed after exhaustion");
}
