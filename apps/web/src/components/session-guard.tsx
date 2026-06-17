"use client";

import { Skeleton } from "@community/ui/components/skeleton";

import { authClient } from "@/lib/auth-client";

export function SessionGuard({ children }: { children: React.ReactNode }) {
  const { isPending } = authClient.useSession();

  if (isPending) {
    return (
      <div className="flex h-svh items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <span className="font-bold text-2xl">AceFluency</span>
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
    );
  }

  return children;
}
