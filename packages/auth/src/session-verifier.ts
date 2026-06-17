export interface SessionRotationResult {
  originalSession: { token: string; expiresAt: Date } | null;
  refreshedSession: { token: string; expiresAt: Date } | null;
  rotationVerified: boolean;
}

interface AuthApi {
  getSession: (opts: { headers: Headers }) => Promise<{
    session: { token: string; expiresAt: string };
    user: { id: string };
  } | null>;
}

export async function verifySessionRotation(
  api: AuthApi,
  headers: Headers
): Promise<SessionRotationResult> {
  const before = await api.getSession({ headers });

  if (!before) {
    return {
      originalSession: null,
      refreshedSession: null,
      rotationVerified: false,
    };
  }

  const originalToken = before.session.token;
  const originalExpiresAt = new Date(before.session.expiresAt);

  const after = await api.getSession({ headers });

  if (!after) {
    return {
      originalSession: { token: originalToken, expiresAt: originalExpiresAt },
      refreshedSession: null,
      rotationVerified: false,
    };
  }

  const refreshedExpiresAt = new Date(after.session.expiresAt);
  const expiresExtended = refreshedExpiresAt >= originalExpiresAt;

  return {
    originalSession: { token: originalToken, expiresAt: originalExpiresAt },
    refreshedSession: {
      token: after.session.token,
      expiresAt: refreshedExpiresAt,
    },
    rotationVerified: expiresExtended,
  };
}

export async function verifyOldTokenRejected(
  api: AuthApi,
  expiredHeaders: Headers
): Promise<boolean> {
  const session = await api.getSession({
    headers: expiredHeaders,
  });
  return session === null;
}
