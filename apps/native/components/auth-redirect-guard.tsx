import { useRouter } from "expo-router";
import type { ReactNode } from "react";
import { useEffect } from "react";

import { authClient } from "@/lib/auth-client";

/**
 * Keeps the user on `/(auth)` without a session and on `/(app)` with one.
 * Renders nothing while the session query is pending.
 */
export function AuthRedirectGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    if (isPending) {
      return;
    }
    router.replace(session ? "/(app)" : "/(auth)");
  }, [isPending, router, session]);

  if (isPending) {
    return null;
  }

  return children;
}
