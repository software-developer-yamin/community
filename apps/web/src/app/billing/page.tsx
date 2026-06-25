"use client";

import { Button } from "@community/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@community/ui/components/card";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { orpc } from "@/utils/orpc";

const PLANS = [
  {
    tier: "premium" as const,
    name: "Premium",
    monthly: 299,
    annual: 2999,
    features: ["Priority matching", "HD video calls", "Unlimited calls"],
  },
  {
    tier: "premium_plus" as const,
    name: "Premium Plus",
    monthly: 599,
    annual: 5999,
    features: [
      "All Premium features",
      "Partner preferences",
      "Advanced analytics",
    ],
  },
];

export default function BillingPage() {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">(
    "monthly"
  );

  const initiate = useMutation({
    ...orpc.billing.initiatePayment.mutationOptions(),
    onSuccess: (data) => {
      window.location.href = data.gatewayUrl;
    },
    onError: (err) => {
      toast.error(err.message ?? "Payment gateway error. Please try again.");
    },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-6">
      <div>
        <h1 className="font-bold text-2xl">Choose a Plan</h1>
        <p className="mt-1 text-muted-foreground">
          Upgrade to unlock premium features
        </p>
      </div>

      <div className="flex gap-2">
        <Button
          onClick={() => setBillingPeriod("monthly")}
          size="sm"
          variant={billingPeriod === "monthly" ? "default" : "outline"}
        >
          Monthly
        </Button>
        <Button
          onClick={() => setBillingPeriod("annual")}
          size="sm"
          variant={billingPeriod === "annual" ? "default" : "outline"}
        >
          Annual
          <span className="ml-1 text-xs opacity-70">Save ~17%</span>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {PLANS.map((plan) => (
          <Card className="flex flex-col" key={plan.tier}>
            <CardHeader>
              <CardTitle>{plan.name}</CardTitle>
              <CardDescription>
                <span className="font-bold text-2xl text-foreground">
                  ৳{billingPeriod === "monthly" ? plan.monthly : plan.annual}
                </span>
                <span className="ml-1 text-sm">
                  / {billingPeriod === "monthly" ? "month" : "year"}
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-4">
              <ul className="space-y-1 text-sm">
                {plan.features.map((f) => (
                  <li className="flex items-center gap-2" key={f}>
                    <span className="text-green-500">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                className="mt-auto"
                disabled={initiate.isPending}
                onClick={() =>
                  initiate.mutate({ tier: plan.tier, billingPeriod })
                }
              >
                {initiate.isPending
                  ? "Redirecting…"
                  : `Upgrade to ${plan.name}`}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
