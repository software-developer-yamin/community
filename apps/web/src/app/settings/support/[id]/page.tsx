"use client";

import { Button } from "@community/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@community/ui/components/card";
import { Input } from "@community/ui/components/input";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { use, useState } from "react";
import { toast } from "sonner";

import { orpc } from "@/utils/orpc";

function formatRelative(date: Date | string): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const secs = Math.floor((now - then) / 1000);
  if (secs < 60) {
    return "just now";
  }
  if (secs < 3600) {
    return `${Math.floor(secs / 60)}m ago`;
  }
  if (secs < 86_400) {
    return `${Math.floor(secs / 3600)}h ago`;
  }
  if (secs < 604_800) {
    return `${Math.floor(secs / 86_400)}d ago`;
  }
  return new Date(date).toLocaleDateString();
}

const STATUS_COLORS: Record<string, string> = {
  open: "bg-blue-500",
  pending: "bg-yellow-500",
  resolved: "bg-green-500",
  closed: "bg-gray-500",
};

const SENDER_NAMES: Record<string, string> = {
  user: "You",
  agent: "Support Agent",
  system: "System",
};

const SENDER_BG: Record<string, string> = {
  user: "bg-primary/10 border-primary/20",
  agent: "bg-muted border-border",
  system: "bg-amber-50 border-amber-200",
};

export default function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const [newMessage, setNewMessage] = useState("");

  const { data: allTickets, isLoading: ticketsLoading } = useQuery(
    orpc.rebuild.getMyTickets.queryOptions()
  );
  const ticket = allTickets?.find((t) => t.id === id);

  const { data: messages, isLoading: messagesLoading } = useQuery(
    orpc.rebuild.getTicketMessages.queryOptions({
      input: { ticketId: id },
    })
  );

  const sendMessage = useMutation(
    orpc.rebuild.addTicketMessage.mutationOptions({
      onSuccess: () => {
        setNewMessage("");
        queryClient.invalidateQueries({
          queryKey: orpc.rebuild.getTicketMessages.key(),
        });
        toast.success("Message sent");
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) {
      return;
    }
    sendMessage.mutate({ ticketId: id, body: newMessage });
  };

  if (ticketsLoading || messagesLoading) {
    return (
      <div className="space-y-4">
        <div className="h-32 animate-pulse rounded-lg bg-muted" />
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground text-sm">Ticket not found.</p>
        </CardContent>
      </Card>
    );
  }

  const statusColor = STATUS_COLORS[ticket.status] ?? "bg-gray-500";

  return (
    <div className="space-y-6">
      {/* Ticket Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <CardTitle className="text-xl">{ticket.subject}</CardTitle>
              <CardDescription className="mt-1">
                #{ticket.ticketNumber} &middot; Created{" "}
                {new Date(ticket.createdAt).toLocaleDateString()}
              </CardDescription>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span
                className={`inline-block h-2.5 w-2.5 rounded-full ${statusColor}`}
              />
              <span className="text-muted-foreground text-sm capitalize">
                {ticket.status}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 text-muted-foreground text-xs">
            <span className="capitalize">Category: {ticket.category}</span>
            <span className="capitalize">Priority: {ticket.priority}</span>
            {ticket.slaDeadline ? (
              <span>SLA: {formatRelative(ticket.slaDeadline)}</span>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {/* Original Description */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="font-medium text-sm">Description</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-muted-foreground text-sm">
            {ticket.description}
          </p>
        </CardContent>
      </Card>

      {/* Message Thread */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">
            Messages ({messages?.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {messages && messages.length > 0 ? (
            messages.map((msg) => (
              <div
                className={`rounded-lg border p-3 ${
                  SENDER_BG[msg.senderRole] ?? "border-border bg-muted"
                }`}
                key={msg.id}
              >
                <div className="mb-1 flex items-center justify-between">
                  <span className="font-medium text-xs">
                    {SENDER_NAMES[msg.senderRole] ?? msg.senderRole}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {formatRelative(msg.createdAt)}
                  </span>
                </div>
                <p className="whitespace-pre-wrap text-muted-foreground text-sm">
                  {msg.body}
                </p>
              </div>
            ))
          ) : (
            <p className="py-4 text-center text-muted-foreground text-sm">
              No messages yet.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Reply Form */}
      {ticket.status !== "closed" && ticket.status !== "resolved" ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-medium text-sm">Add a Message</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="flex gap-2" onSubmit={handleSubmit}>
              <Input
                className="flex-1"
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                value={newMessage}
              />
              <Button
                disabled={sendMessage.isPending || !newMessage.trim()}
                type="submit"
              >
                {sendMessage.isPending ? "Sending..." : "Send"}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
