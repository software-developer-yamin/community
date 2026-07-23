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
        <Button render={<Link href="/billing" />}>Try Again</Button>
        <Button render={<Link href="/" />} variant="outline">
          Go Home
        </Button>
      </div>
    </div>
  );
}
