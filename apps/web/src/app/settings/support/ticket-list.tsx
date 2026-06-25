"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@community/ui/components/card";
import { Skeleton } from "@community/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";

import { orpc } from "@/utils/orpc";

const STATUS_COLORS: Record<string, string> = {
  open: "bg-blue-500",
  pending: "bg-yellow-500",
  resolved: "bg-green-500",
  closed: "bg-gray-500",
};

const SKELETON_KEYS = ["skeleton-0", "skeleton-1", "skeleton-2"];

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-slate-500",
  normal: "bg-blue-500",
  high: "bg-orange-500",
  urgent: "bg-red-500",
};

export function TicketList() {
  const { data: tickets, isLoading } = useQuery(
    orpc.rebuild.getMyTickets.queryOptions()
  );

  if (isLoading) {
    return (
      <div className="space-y-3">
        {SKELETON_KEYS.map((key) => (
          <Skeleton className="h-28 w-full rounded-lg" key={key} />
        ))}
      </div>
    );
  }

  if (!tickets || tickets.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground text-sm">
            No tickets yet. Create one above.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {tickets.map((ticket) => {
        const created = new Date(ticket.createdAt);
        return (
          <Card
            className="cursor-pointer transition-colors hover:bg-accent/50"
            key={ticket.id}
            onClick={() => {
              window.location.href = `/settings/support/${ticket.id}`;
            }}
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-base leading-snug">
                    {ticket.subject}
                  </CardTitle>
                  <CardDescription className="mt-0.5 line-clamp-1">
                    {ticket.description}
                  </CardDescription>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${STATUS_COLORS[ticket.status] ?? "bg-gray-500"}`}
                  />
                  <span className="text-muted-foreground text-xs capitalize">
                    {ticket.status}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center gap-3 text-muted-foreground text-xs">
                <span>#{ticket.ticketNumber}</span>
                <span>{created.toLocaleDateString()}</span>
                <span className="capitalize">{ticket.category}</span>
                {ticket.priority ? (
                  <span
                    className={`inline-block h-1.5 w-1.5 rounded-full ${PRIORITY_COLORS[ticket.priority] ?? "bg-blue-500"}`}
                  />
                ) : null}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
