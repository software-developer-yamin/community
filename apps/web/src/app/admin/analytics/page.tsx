"use client";

import { useQuery } from "@tanstack/react-query";
import { BarChart3, Clock, TrendingUp } from "lucide-react";

import { orpc } from "@/utils/orpc";

export default function AdminAnalyticsPage() {
  const { data: stats, isLoading } = useQuery(
    orpc.recommendations.adminStats.queryOptions()
  );

  const actionEmojis = {
    like: "👍",
    bookmark: "🔖",
    view: "👁️",
    complete: "✅",
    share: "📤",
    dismiss: "✕",
  } as Record<string, string>;

  const actionColors = {
    like: "bg-red-50 text-red-600",
    bookmark: "bg-blue-50 text-blue-600",
    view: "bg-green-50 text-green-600",
    complete: "bg-purple-50 text-purple-600",
    share: "bg-orange-50 text-orange-600",
    dismiss: "bg-gray-50 text-gray-600",
  } as Record<string, string>;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-32 animate-pulse rounded-lg bg-muted" />
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  const actionCounts =
    stats?.recentInteractions?.reduce(
      (acc, interaction) => {
        acc[interaction.action] = (acc[interaction.action] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    ) ?? {};

  return (
    <div className="space-y-6">
      {/* Action Distribution */}
      <div className="rounded-lg border">
        <div className="border-b p-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-semibold">Recent Activity Breakdown</h2>
          </div>
        </div>
        <div className="p-4">
          {Object.keys(actionCounts).length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Object.entries(actionCounts).map(([action, count]) => (
                <div
                  className={`rounded-lg p-4 ${actionColors[action] ?? "bg-muted"}`}
                  key={action}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">
                      {actionEmojis[action] ?? "📊"}
                    </span>
                    <div>
                      <p className="font-bold text-2xl">{count}</p>
                      <p className="text-sm capitalize">{action}s</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              No interaction data available yet.
            </p>
          )}
        </div>
      </div>

      {/* Popular Content Table */}
      <div className="rounded-lg border">
        <div className="border-b p-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-semibold">Top Content by Likes</h2>
          </div>
        </div>
        <div className="p-4">
          {stats?.popularContent && stats.popularContent.length > 0 ? (
            <div className="space-y-4">
              {stats.popularContent.map((item, index) => (
                <div className="flex items-center gap-4" key={item.contentId}>
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted font-bold text-sm">
                    {index + 1}
                  </span>
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      {item.content?.title ?? "Unknown content"}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {item.content?.cefrLevel} • {item.content?.type}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-32 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{
                          width: `${
                            (item.count /
                              (stats.popularContent[0]?.count ?? 1)) *
                            100
                          }%`,
                        }}
                      />
                    </div>
                    <span className="w-8 text-right font-medium text-sm">
                      {item.count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              No content likes recorded yet.
            </p>
          )}
        </div>
      </div>

      {/* System Overview */}
      <div className="rounded-lg border">
        <div className="border-b p-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-semibold">System Overview</h2>
          </div>
        </div>
        <div className="p-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg bg-muted/50 p-4">
              <p className="text-muted-foreground text-sm">Total Users</p>
              <p className="font-bold text-2xl">{stats?.counts.users ?? 0}</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-4">
              <p className="text-muted-foreground text-sm">Content Items</p>
              <p className="font-bold text-2xl">{stats?.counts.content ?? 0}</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-4">
              <p className="text-muted-foreground text-sm">Interactions</p>
              <p className="font-bold text-2xl">
                {stats?.counts.interactions ?? 0}
              </p>
            </div>
            <div className="rounded-lg bg-muted/50 p-4">
              <p className="text-muted-foreground text-sm">Rec. Scores</p>
              <p className="font-bold text-2xl">{stats?.counts.scores ?? 0}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
