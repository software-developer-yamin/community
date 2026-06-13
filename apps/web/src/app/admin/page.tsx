"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  BookOpen,
  Clock,
  Star,
  TrendingUp,
  Users,
} from "lucide-react";

import { orpc } from "@/utils/orpc";

export default function AdminDashboardPage() {
  const { data: stats, isLoading } = useQuery(
    orpc.recommendations.adminStats.queryOptions()
  );

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="h-32 animate-pulse rounded-lg bg-muted" />
        <div className="h-32 animate-pulse rounded-lg bg-muted" />
        <div className="h-32 animate-pulse rounded-lg bg-muted" />
        <div className="h-32 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  const statCards = [
    {
      label: "Total Users",
      value: stats?.counts.users ?? 0,
      icon: Users,
      color: "text-blue-500",
      bg: "bg-blue-50",
    },
    {
      label: "Content Items",
      value: stats?.counts.content ?? 0,
      icon: BookOpen,
      color: "text-green-500",
      bg: "bg-green-50",
    },
    {
      label: "Interactions",
      value: stats?.counts.interactions ?? 0,
      icon: Activity,
      color: "text-purple-500",
      bg: "bg-purple-50",
    },
    {
      label: "Rec. Scores",
      value: stats?.counts.scores ?? 0,
      icon: Star,
      color: "text-orange-500",
      bg: "bg-orange-50",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div className="rounded-lg border bg-card p-6" key={stat.label}>
              <div className="flex items-center gap-4">
                <div className={`rounded-lg p-3 ${stat.bg}`}>
                  <Icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">{stat.label}</p>
                  <p className="font-bold text-2xl">{stat.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Activity & Popular Content */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Interactions */}
        <div className="rounded-lg border">
          <div className="border-b p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <h2 className="font-semibold">Recent Activity</h2>
            </div>
          </div>
          <div className="p-4">
            {stats?.recentInteractions &&
            stats.recentInteractions.length > 0 ? (
              <div className="space-y-3">
                {stats.recentInteractions.map((interaction) => (
                  <div
                    className="flex items-center justify-between rounded-lg bg-muted/50 p-3"
                    key={interaction.id}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">
                        {interaction.action === "like" && "👍"}
                        {interaction.action === "bookmark" && "🔖"}
                        {interaction.action === "view" && "👁️"}
                        {interaction.action === "complete" && "✅"}
                        {interaction.action === "share" && "📤"}
                        {interaction.action === "dismiss" && "✕"}
                      </span>
                      <div>
                        <p className="font-medium text-sm capitalize">
                          {interaction.action}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {new Date(interaction.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <span className="text-muted-foreground text-xs">
                      {interaction.userId.slice(0, 8)}...
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                No recent activity
              </p>
            )}
          </div>
        </div>

        {/* Popular Content */}
        <div className="rounded-lg border">
          <div className="border-b p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
              <h2 className="font-semibold">Most Liked Content</h2>
            </div>
          </div>
          <div className="p-4">
            {stats?.popularContent && stats.popularContent.length > 0 ? (
              <div className="space-y-3">
                {stats.popularContent.map((item) => (
                  <div
                    className="flex items-center justify-between rounded-lg bg-muted/50 p-3"
                    key={item.contentId}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-sm">
                        {item.content?.title ?? "Unknown content"}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {item.content?.cefrLevel} • {item.content?.type}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-sm">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-medium">{item.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No data yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
