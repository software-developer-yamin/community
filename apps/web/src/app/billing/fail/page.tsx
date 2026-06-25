"use client";

import { Button } from "@community/ui/components/button";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function FailContent() {
  const params = useSearchParams();
  const tranId = params.get("tran_id");

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
      <span className="text-5xl">❌</span>
      <h1 className="font-bold text-2xl">Payment Failed</h1>
      <p className="text-muted-foreground">
        Your payment could not be processed.
        {tranId ? ` (Ref: ${tranId})` : ""} Please try again or use a different
        payment method.
      </p>
      <div className="flex gap-3">
        <Button asChild>
          <Link href="/billing">Try Again</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/">Go Home</Link>
        </Button>
      </div>
    </div>
  );
}

export default function BillingFailPage() {
  return (
    <Suspense>
      <FailContent />
    </Suspense>
  );
}
