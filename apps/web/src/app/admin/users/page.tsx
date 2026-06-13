"use client";

import { useQuery } from "@tanstack/react-query";
import { Search, Shield, User } from "lucide-react";
import { useState } from "react";

import { orpc } from "@/utils/orpc";

interface UserData {
  cefr: { level: string; score: number } | null;
  createdAt: string;
  email: string;
  id: string;
  name: string;
  preferences: { dailyGoal: number; interests: string[] } | null;
  role: string;
}

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  const { data: users, isLoading } = useQuery(
    orpc.recommendations.adminListUsers.queryOptions({
      input: { limit: 100, offset: 0 },
    })
  );

  const items = (users as UserData[] | undefined) ?? [];

  const filtered = items.filter((item) => {
    const matchesSearch =
      search === "" ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "all" || item.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const roleColor = {
    admin: "bg-purple-100 text-purple-800",
    user: "bg-blue-100 text-blue-800",
  } as Record<string, string>;

  const cefrColor = {
    A1: "bg-green-100 text-green-800",
    A2: "bg-green-200 text-green-800",
    B1: "bg-yellow-100 text-yellow-800",
    B2: "bg-yellow-200 text-yellow-800",
    C1: "bg-orange-100 text-orange-800",
    C2: "bg-red-100 text-red-800",
  } as Record<string, string>;

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative max-w-md flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            className="w-full rounded-md border bg-background py-2 pr-4 pl-9 text-sm"
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users..."
            type="text"
            value={search}
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm">Role:</span>
          {["all", "admin", "user"].map((r) => (
            <button
              className={`rounded-md px-3 py-1 text-sm ${
                roleFilter === r
                  ? "bg-primary text-primary-foreground"
                  : "border hover:bg-accent"
              }`}
              key={r}
              onClick={() => setRoleFilter(r)}
              type="button"
            >
              {r === "all" ? "All" : r}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      {isLoading ? (
        <div className="space-y-3">
          <div className="h-16 animate-pulse rounded-lg bg-muted" />
          <div className="h-16 animate-pulse rounded-lg bg-muted" />
          <div className="h-16 animate-pulse rounded-lg bg-muted" />
        </div>
      ) : (
        <div className="rounded-lg border">
          <div className="grid grid-cols-12 gap-4 border-b px-4 py-3 font-medium text-muted-foreground text-sm">
            <div className="col-span-4">User</div>
            <div className="col-span-2">Role</div>
            <div className="col-span-2">CEFR</div>
            <div className="col-span-2">Daily Goal</div>
            <div className="col-span-2">Joined</div>
          </div>
          <div className="divide-y">
            {filtered.map((item) => (
              <div
                className="grid grid-cols-12 items-center gap-4 px-4 py-3"
                key={item.id}
              >
                <div className="col-span-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                      <User className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{item.name}</p>
                      <p className="text-muted-foreground text-xs">
                        {item.email}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="col-span-2">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium text-xs ${
                      roleColor[item.role] ?? "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {item.role === "admin" && <Shield className="h-3 w-3" />}
                    {item.role}
                  </span>
                </div>
                <div className="col-span-2">
                  {item.cefr ? (
                    <span
                      className={`rounded-full px-2 py-0.5 font-medium text-xs ${
                        cefrColor[item.cefr.level] ??
                        "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {item.cefr.level}
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-sm">—</span>
                  )}
                </div>
                <div className="col-span-2 text-muted-foreground text-sm">
                  {item.preferences?.dailyGoal ?? "—"} min
                </div>
                <div className="col-span-2 text-muted-foreground text-sm">
                  {new Date(item.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {filtered.length === 0 && !isLoading && (
        <div className="rounded-lg border p-8 text-center text-muted-foreground">
          No users found matching your filters.
        </div>
      )}
    </div>
  );
}
