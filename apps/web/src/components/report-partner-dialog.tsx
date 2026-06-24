"use client";

import { Button } from "@community/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@community/ui/components/dialog";
import { Label } from "@community/ui/components/label";
import { Textarea } from "@community/ui/components/textarea";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { orpc, queryClient } from "@/utils/orpc";

const REPORT_REASONS = [
  { value: "non_participation" as const, label: "Partner didn't participate" },
  { value: "abuse" as const, label: "Abusive behavior" },
  {
    value: "technical_failure" as const,
    label: "Technical issue (no audio/video)",
  },
  { value: "other" as const, label: "Other" },
] as const;

export function ReportPartnerDialog() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"select" | "success">("select");
  const [selectedRoom, setSelectedRoom] = useState<string>("");
  const [selectedReason, setSelectedReason] = useState<string>("");
  const [details, setDetails] = useState("");
  const [strikeVoided, setStrikeVoided] = useState(false);

  const roomsQuery = useQuery({
    ...orpc.moderation.getUserEndedRooms.queryOptions(),
    enabled: open,
  });

  const reportMutation = useMutation(
    orpc.moderation.reportPartner.mutationOptions({
      onSuccess: (data) => {
        setStrikeVoided(data.strikeVoided ?? false);
        setStep("success");
        setSelectedRoom("");
        setSelectedReason("");
        setDetails("");
        queryClient.invalidateQueries({
          queryKey: orpc.moderation.getUserEndedRooms.key(),
        });
      },
    })
  );

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      // Reset state on close
      setStep("select");
      setSelectedRoom("");
      setSelectedReason("");
      setDetails("");
      setStrikeVoided(false);
    }
  };

  const handleSubmit = () => {
    if (!(selectedRoom && selectedReason)) {
      return;
    }
    reportMutation.mutate({
      roomName: selectedRoom,
      reason: selectedReason as
        | "non_participation"
        | "abuse"
        | "technical_failure"
        | "other",
      ...(details.trim() ? { details: details.trim() } : {}),
    });
  };

  const rooms = roomsQuery.data?.rooms ?? [];
  const canSubmit = selectedRoom && selectedReason && !reportMutation.isPending;

  if (step === "success") {
    return (
      <Dialog onOpenChange={handleOpenChange} open={open}>
        <DialogTrigger asChild>
          <Button className="w-full" variant="outline">
            Report an Issue
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report Submitted</DialogTitle>
            <DialogDescription>
              {strikeVoided
                ? "Report submitted. Your strike has been voided."
                : "Thanks for your report — we'll review it."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => handleOpenChange(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogTrigger asChild>
        <Button className="w-full" variant="outline">
          Report an Issue
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report an Issue</DialogTitle>
          <DialogDescription>
            Let us know what went wrong with your call.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Room selector */}
          <div className="grid gap-2">
            <Label htmlFor="room">Call</Label>
            {(() => {
              if (roomsQuery.isLoading) {
                return (
                  <p className="text-muted-foreground text-sm">
                    Loading recent calls...
                  </p>
                );
              }
              if (rooms.length === 0) {
                return (
                  <p className="text-muted-foreground text-sm">
                    No recent ended calls available to report. Calls must be
                    reported within 60 seconds of ending.
                  </p>
                );
              }
              return (
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  id="room"
                  onChange={(e) => setSelectedRoom(e.target.value)}
                  value={selectedRoom}
                >
                  <option value="">Select a call...</option>
                  {rooms.map(
                    (room: {
                      id: string;
                      roomName: string;
                      endedAt: Date | null;
                    }) => (
                      <option key={room.id} value={room.roomName}>
                        {room.roomName} —{" "}
                        {room.endedAt
                          ? new Date(room.endedAt).toLocaleTimeString()
                          : "just now"}
                      </option>
                    )
                  )}
                </select>
              );
            })()}
          </div>

          {/* Reason selector */}
          <div className="grid gap-2">
            <Label htmlFor="reason">Reason</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              id="reason"
              onChange={(e) => setSelectedReason(e.target.value)}
              value={selectedReason}
            >
              <option value="">Select a reason...</option>
              {REPORT_REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {/* Optional details */}
          <div className="grid gap-2">
            <Label htmlFor="details">Details (optional)</Label>
            <Textarea
              id="details"
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Tell us more about what happened..."
              rows={3}
              value={details}
            />
          </div>
        </div>

        {reportMutation.isError && (
          <p className="text-destructive text-sm">
            Failed to submit report. Please try again.
          </p>
        )}

        <DialogFooter>
          <Button
            disabled={reportMutation.isPending}
            onClick={() => handleOpenChange(false)}
            variant="outline"
          >
            Cancel
          </Button>
          <Button disabled={!canSubmit} onClick={handleSubmit}>
            {reportMutation.isPending ? "Submitting..." : "Submit Report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
