import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import type { AuthClient } from "@community/auth/session-refresh";
import { proactiveRefresh } from "@community/auth/session-refresh";

const CHECK_INTERVAL_MS = 60_000; // check session expiry every 60s
const BACKOFF_CHECK_MS = 10_000; // check sooner (10s) after a failed refresh

interface TokenRefreshState {
  isRefreshing: boolean;
  lastRefreshedAt: number | null;
  lastError: Error | null;
  paused: boolean;
  triggerRefresh: () => Promise<void>;
  pauseRefreshing: () => void;
  resumeRefreshing: () => void;
}

const TokenRefreshContext = createContext<TokenRefreshState | null>(null);

export function useTokenRefresh(): TokenRefreshState {
  const ctx = useContext(TokenRefreshContext);
  if (!ctx) {
    throw new Error("useTokenRefresh must be used within a TokenRefreshProvider");
  }
  return ctx;
}

export interface TokenRefreshProviderProps {
  authClient: AuthClient;
  children: React.ReactNode;
}

export function TokenRefreshProvider({
  authClient,
  children,
}: TokenRefreshProviderProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<number | null>(null);
  const [lastError, setLastError] = useState<Error | null>(null);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const refresh = useCallback(async () => {
    if (pausedRef.current) {
      return;
    }

    setIsRefreshing(true);
    try {
      await proactiveRefresh(authClient, {
        onEvent: (event) => {
          if (event === "refreshed") {
            setLastRefreshedAt(Date.now());
            setLastError(null);
          }
          if (event === "failed") {
            setLastError(new Error("Session refresh failed"));
          }
        },
      });
    } catch (error) {
      setLastError(
        error instanceof Error ? error : new Error("Session refresh failed"),
      );
    } finally {
      setIsRefreshing(false);
    }
  }, [authClient]);

  const pauseRefreshing = useCallback(() => {
    pausedRef.current = true;
    setPaused(true);
  }, []);

  const resumeRefreshing = useCallback(() => {
    pausedRef.current = false;
    setPaused(false);
  }, []);

  // Periodic background check
  useEffect(() => {
    const interval = setInterval(
      () => {
        refresh();
      },
      lastError ? BACKOFF_CHECK_MS : CHECK_INTERVAL_MS,
    );
    intervalRef.current = interval;

    return () => clearInterval(interval);
  }, [refresh, lastError]);

  // Initial check on mount (skipped if paused)
  useEffect(() => {
    if (!pausedRef.current) {
      refresh();
    }
  }, [refresh]);

  return (
    <TokenRefreshContext
      value={{
        isRefreshing,
        lastRefreshedAt,
        lastError,
        paused,
        triggerRefresh: refresh,
        pauseRefreshing,
        resumeRefreshing,
      }}
    >
      {children}
    </TokenRefreshContext>
  );
}
