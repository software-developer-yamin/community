"use client";

import { Button } from "@community/ui/components/button";
import Link from "next/link";

export default function BillingCancelPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
      <span className="text-5xl">↩️</span>
      <h1 className="font-bold text-2xl">Payment Cancelled</h1>
      <p className="text-muted-foreground">
        You cancelled the payment. No charge was made.
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
