"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Bookmark, RefreshCw, Share2, ThumbsUp, X } from "lucide-react";
import { useState } from "react";

import { orpc } from "@/utils/orpc";

import { ContentCard } from "./content-card";

interface ContentItem {
  cefrLevel: string;
  description: string;
  duration: number | null;
  id: string;
  recommendationReason: string;
  recommendationScore: number;
  tags: string[];
  thumbnailUrl: string | null;
  title: string;
  type: string;
}

export function RecommendationFeed() {
  const [recalculate, setRecalculate] = useState(false);
  const { data, isLoading, error, refetch } = useQuery(
    orpc.recommendations.getRecommendations.queryOptions({
      input: {
        limit: 12,
        recalculate,
      },
    })
  );

  const trackInteraction = useMutation(
    orpc.recommendations.trackInteraction.mutationOptions()
  );

  const recommendations = (data as ContentItem[] | undefined) ?? [];

  const handleRefresh = () => {
    setRecalculate(true);
    refetch().then(() => setRecalculate(false));
  };

  const handleInteraction = (contentId: string, action: string) => {
    trackInteraction.mutate({
      contentId,
      action: action as "like" | "bookmark" | "share" | "dismiss",
    });
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-600">
        Failed to load recommendations: {error.message}
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div className="rounded-lg border p-8 text-center">
        <p className="mb-4 text-muted-foreground">
          No recommendations yet. Complete your profile or try refreshing.
        </p>
        <button
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
          onClick={handleRefresh}
          type="button"
        >
          <RefreshCw className="h-4 w-4" />
          Generate Recommendations
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          {recommendations.length} items recommended
        </p>
        <button
          className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
          onClick={handleRefresh}
          type="button"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {recommendations.map((item) => (
          <div className="group relative" key={item.id}>
            <ContentCard
              cefrLevel={item.cefrLevel}
              description={item.description}
              duration={item.duration}
              reason={item.recommendationReason}
              score={item.recommendationScore}
              tags={item.tags}
              thumbnailUrl={item.thumbnailUrl}
              title={item.title}
              type={item.type}
            />
            <div className="absolute top-2 right-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                className="rounded-full bg-background/90 p-1.5 shadow-sm hover:bg-accent"
                onClick={() => handleInteraction(item.id, "like")}
                title="Like"
                type="button"
              >
                <ThumbsUp className="h-4 w-4" />
              </button>
              <button
                className="rounded-full bg-background/90 p-1.5 shadow-sm hover:bg-accent"
                onClick={() => handleInteraction(item.id, "bookmark")}
                title="Bookmark"
                type="button"
              >
                <Bookmark className="h-4 w-4" />
              </button>
              <button
                className="rounded-full bg-background/90 p-1.5 shadow-sm hover:bg-accent"
                onClick={() => handleInteraction(item.id, "share")}
                title="Share"
                type="button"
              >
                <Share2 className="h-4 w-4" />
              </button>
              <button
                className="rounded-full bg-background/90 p-1.5 shadow-sm hover:bg-accent"
                onClick={() => handleInteraction(item.id, "dismiss")}
                title="Not interested"
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
