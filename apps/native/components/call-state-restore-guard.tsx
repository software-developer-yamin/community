import { useRouter } from "expo-router";
import { useEffect } from "react";

import {
  clearCallState,
  getCallState,
  isStateStale,
} from "@/utils/call-state-storage";

/**
 * Checks for a saved call state on app startup (cold start after OS-kill).
 *
 * If a non-stale call state is found (< 30 min old), the OS killed the app
 * during an active call. We redirect to "call ended — connection lost" and
 * clear the persisted state so the next startup is clean.
 *
 * Must be rendered inside SessionRestoreGuard so it only runs after the
 * auth session is available. Renders children immediately; the redirect
 * happens asynchronously in useEffect.
 *
 * Addresses: AC-3, R-001 (OS-kill recovery)
 */
export function CallStateRestoreGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    const checkAndRestore = async () => {
      try {
        const saved = await getCallState();
        if (cancelled) {
          return;
        }
        if (!saved) {
          return;
        }
        // Always clear the state — whether stale or not, we won't rejoin
        await clearCallState();
        if (cancelled) {
          return;
        }
        if (!isStateStale(saved)) {
          // State is fresh — app was killed during an active call
          // Show "call ended — connection lost" without issuing a strike
          router.replace(
            `/call/ended?reason=connection_lost&roomName=${encodeURIComponent(saved.roomName)}`
          );
        }
        // Stale state (> 30 min): cleared silently, normal startup
      } catch {
        // Best-effort — never block startup
      }
    };

    checkAndRestore();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return children;
}
