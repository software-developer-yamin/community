"use client";

import { Button } from "@community/ui/components/button";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { orpc } from "@/utils/orpc";

function SuccessContent() {
  const params = useSearchParams();
  const tranId = params.get("tran_id") ?? "";

  const { data, isLoading } = useQuery({
    ...orpc.billing.getPaymentStatus.queryOptions({ input: { tranId } }),
    enabled: !!tranId,
    refetchInterval: (query) =>
      query.state.data?.status === "completed" ? false : 2000,
    refetchIntervalInBackground: true,
  });

  if (isLoading || data?.status === "pending") {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-muted-foreground">Confirming your payment…</p>
      </div>
    );
  }

  if (data?.status === "completed") {
    const tierLabel = data.tier === "premium_plus" ? "Premium Plus" : "Premium";
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
        <span className="text-5xl">🎉</span>
        <h1 className="font-bold text-2xl">Payment Successful!</h1>
        <p className="text-muted-foreground">
          You&apos;re now on <strong>{tierLabel}</strong>. Enjoy your upgraded
          experience.
        </p>
        <Button asChild>
          <Link href="/">Go to Dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
      <span className="text-5xl">⚠️</span>
      <h1 className="font-bold text-2xl">Payment Not Confirmed</h1>
      <p className="text-muted-foreground">
        We couldn&apos;t confirm your payment. If you were charged, contact
        support.
      </p>
      <Button asChild variant="outline">
        <Link href="/billing">Try Again</Link>
      </Button>
    </div>
  );
}

export default function BillingSuccessPage() {
  return (
    <Suspense>
      <SuccessContent />
    </Suspense>
  );
}
