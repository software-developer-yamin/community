"use client";

import { Button } from "@community/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@community/ui/components/card";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { ReportPartnerDialog } from "@/components/report-partner-dialog";
import { orpc } from "@/utils/orpc";

type MatchStatus =
  | "searching"
  | "stale"
  | "long_wait"
  | "found"
  | "no_embedding";

const STATUS_CONFIG: Record<
  MatchStatus,
  { message: string; showActions: boolean }
> = {
  searching: {
    message: "Looking for a partner...",
    showActions: false,
  },
  stale: {
    message: "No partners online right now — we'll keep trying",
    showActions: true,
  },
  long_wait: {
    message: "We've been looking for 5 minutes",
    showActions: true,
  },
  found: {
    message: "Partner found!",
    showActions: false,
  },
  no_embedding: {
    message: "Set up your profile first to find practice partners.",
    showActions: false,
  },
};

function formatTime(seconds: number): string {
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export default function MatchingPage() {
  const router = useRouter();
  const [elapsed, setElapsed] = useState(0);
  const [status, setStatus] = useState<MatchStatus>("searching");
  const [foundPartner, setFoundPartner] = useState<{
    id: string;
    name: string;
    image: string | null;
    cefr: string | null;
    sim: number;
  } | null>(null);
  const [filterHint, setFilterHint] = useState(false);
  const elapsedRef = useRef(elapsed);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  elapsedRef.current = elapsed;

  const matchQuery = useQuery({
    ...orpc.models.matchPartners.queryOptions({ input: { limit: 1 } }),
    refetchInterval: 5000,
  });

  useEffect(
    () => () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (pollRef.current) {
        clearInterval(pollRef.current);
      }
    },
    []
  );

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setElapsed((prev) => {
        const next = prev + 1;
        if (next >= 300) {
          setStatus("long_wait");
        } else if (next >= 60) {
          setStatus("stale");
        }
        return next;
      });
    }, 1000);
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!matchQuery.data) {
      return;
    }

    if (matchQuery.data.reason === "no_embedding") {
      setStatus("no_embedding");
      return;
    }

    if (matchQuery.data.partners.length > 0) {
      setStatus("found");
      setFoundPartner(matchQuery.data.partners[0] ?? null);
      return;
    }

    // Check filter hint at 60s+ mark
    const stats = matchQuery.data.queueStats;
    if (elapsed >= 60 && stats && stats.genderFiltered > 0) {
      setFilterHint(true);
    }
  }, [matchQuery.data, elapsed]);

  const handleExit = useCallback(() => {
    router.push("/dashboard");
  }, [router]);

  const handleAdjustFilters = useCallback(() => {
    router.push("/dashboard");
  }, [router]);

  const statusMessage =
    status === "searching" && elapsed > 15
      ? `Still looking... (${formatTime(elapsed)})`
      : STATUS_CONFIG[status].message;

  const renderStatusContent = () => {
    if (status === "found" && foundPartner) {
      return (
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-3xl">
            {foundPartner.image ? (
              // biome-ignore lint/performance/noImgElement: <img> is fine for dynamic user avatars
              <img
                alt={foundPartner.name}
                className="h-20 w-20 rounded-full object-cover"
                height={80}
                src={foundPartner.image}
                width={80}
              />
            ) : (
              <span>{foundPartner.name.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <p className="font-semibold text-lg">{foundPartner.name}</p>
          {foundPartner.cefr && (
            <span className="rounded-full border px-3 py-1 text-sm">
              {foundPartner.cefr}
            </span>
          )}
          <p className="text-muted-foreground text-sm">
            Connecting you to the call room...
          </p>
        </div>
      );
    }

    if (status === "no_embedding") {
      return (
        <p className="text-center text-muted-foreground">
          {STATUS_CONFIG.no_embedding.message}
        </p>
      );
    }

    return (
      <>
        {/* Animated Indicator */}
        <div
          aria-label="Searching"
          className="flex items-center gap-1"
          role="status"
        >
          <span
            className="h-3 w-3 animate-bounce rounded-full bg-primary"
            style={{ animationDelay: "0ms" }}
          />
          <span
            className="h-3 w-3 animate-bounce rounded-full bg-primary"
            style={{ animationDelay: "150ms" }}
          />
          <span
            className="h-3 w-3 animate-bounce rounded-full bg-primary"
            style={{ animationDelay: "300ms" }}
          />
        </div>

        <p className="text-center text-lg">{statusMessage}</p>

        {filterHint && (
          <div className="rounded-lg border bg-muted/50 p-3 text-center text-sm">
            Your gender preference is filtering some potential matches. You may
            find more partners with broader filters.
          </div>
        )}
      </>
    );
  };

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-6 p-6">
      <Card className="w-full">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">
            {status === "found" ? "Match Found!" : "Finding Your Partner"}
          </CardTitle>
          <CardDescription>
            {status === "no_embedding"
              ? "Complete your profile"
              : "We're searching for a conversation partner who matches your preferences"}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-6">
          {renderStatusContent()}

          {/* Timer display */}
          {status !== "found" && status !== "no_embedding" && (
            <div className="font-mono text-muted-foreground text-sm">
              {formatTime(elapsed)}
            </div>
          )}

          {/* Actions */}
          <div className="flex w-full flex-col gap-2">
            {status === "long_wait" && (
              <Button
                className="w-full"
                onClick={handleAdjustFilters}
                variant="outline"
              >
                Lower Filter Strictness
              </Button>
            )}
            {status === "stale" && (
              <Button
                className="w-full"
                onClick={handleAdjustFilters}
                variant="outline"
              >
                Adjust Filters
              </Button>
            )}
            <Button
              className="w-full"
              onClick={handleExit}
              variant={status === "found" ? "default" : "secondary"}
            >
              {status === "found" ? "Go to Call" : "Exit"}
            </Button>

            <ReportPartnerDialog />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
