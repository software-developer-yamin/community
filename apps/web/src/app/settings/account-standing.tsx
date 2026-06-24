"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@community/ui/components/card";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { orpc } from "@/utils/orpc";

const STATE_COLORS: Record<string, { badge: string; bg: string }> = {
  clean: { badge: "bg-green-500/10 text-green-600", bg: "border-green-200" },
  warned: { badge: "bg-yellow-500/10 text-yellow-600", bg: "border-yellow-200" },
  cooldown_1h: { badge: "bg-red-500/10 text-red-600", bg: "border-red-200" },
  cooldown_24h: { badge: "bg-red-500/10 text-red-600", bg: "border-red-200" },
  suspended: { badge: "bg-red-500/10 text-red-600", bg: "border-red-200" },
  banned: { badge: "bg-red-500/10 text-red-600", bg: "border-red-200" },
};

function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  return `${minutes}m ${seconds}s`;
}

export default function AccountStanding() {
  const { data, isLoading, error } = useQuery(
    orpc.moderation.getStrikes.queryOptions()
  );

  const [countdown, setCountdown] = useState<string | null>(null);

  const readableState = data?.readableState;
  const cooldownUntil = data?.cooldownUntil;
  const flaggedForReview = data?.flaggedForReview;
  const state = data?.state;

  useEffect(() => {
    if (!cooldownUntil) {
      setCountdown(null);
      return;
    }

    const target = new Date(cooldownUntil).getTime();

    function tick() {
      const remaining = target - Date.now();
      if (remaining <= 0) {
        setCountdown("Expired — refreshing...");
        return;
      }
      setCountdown(formatCountdown(remaining));
    }

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [cooldownUntil]);

  const colorCfg = state ? STATE_COLORS[state] : STATE_COLORS.clean;

  if (isLoading) {
    return (
      <Card data-testid="account-standing">
        <CardHeader>
          <CardTitle>Account Standing</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  if (error || !readableState) {
    return (
      <Card data-testid="account-standing">
        <CardHeader>
          <CardTitle>Account Standing</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Unable to load account standing information.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      data-testid="account-standing"
      className={`border-l-4 ${colorCfg.bg}`}
    >
      <CardHeader>
        <CardTitle>Account Standing</CardTitle>
        <CardDescription>
          Your current moderation status and account health
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <span
            data-testid="state-badge"
            className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${colorCfg.badge}`}
          >
            {readableState.label}
          </span>
        </div>

        <p data-testid="state-description" className="text-sm">
          {readableState.description}
        </p>

        {countdown !== null && (
          <div
            data-testid="cooldown-countdown"
            className="rounded bg-muted px-3 py-2 font-mono text-sm"
          >
            Time remaining: {countdown}
          </div>
        )}

        {flaggedForReview && (
          <div
            data-testid="flagged-banner"
            className="rounded border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-800"
          >
            Flagged for review — our team is reviewing your recent activity.
          </div>
        )}

        {readableState.action && readableState.actionLink && (
          <div className="pt-1">
            <a
              href={readableState.actionLink}
              data-testid="state-action"
              className="inline-flex h-7 items-center justify-center gap-1.5 rounded-none border border-border bg-background px-2.5 font-medium text-xs hover:bg-muted hover:text-foreground"
            >
              {readableState.action}
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
