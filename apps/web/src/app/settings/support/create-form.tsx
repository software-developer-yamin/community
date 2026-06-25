"use client";

import { Button } from "@community/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@community/ui/components/card";
import { Input } from "@community/ui/components/input";
import { Textarea } from "@community/ui/components/textarea";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { orpc } from "@/utils/orpc";

const SUPPORT_CATEGORIES = [
  { value: "billing", label: "Billing" },
  { value: "technical", label: "Technical Issue" },
  { value: "moderation", label: "Moderation" },
  { value: "other", label: "Other" },
] as const;

type Category = "billing" | "technical" | "moderation" | "other";

export function CreateTicketForm() {
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<Category>("billing");
  const [description, setDescription] = useState("");
  const queryClient = useQueryClient();

  const createTicket = useMutation(
    orpc.rebuild.createSupportTicket.mutationOptions({
      onSuccess: () => {
        toast.success("Ticket created successfully");
        setSubject("");
        setCategory("billing");
        setDescription("");
        queryClient.invalidateQueries({
          queryKey: orpc.rebuild.getMyTickets.queryOptions().queryKey,
        });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!(subject.trim() && description.trim())) {
      return;
    }
    createTicket.mutate({ subject, category, description });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create a Ticket</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="font-medium text-sm" htmlFor="subject">
              Subject
            </label>
            <Input
              id="subject"
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief summary of your issue"
              required
              value={subject}
            />
          </div>

          <div className="space-y-2">
            <label className="font-medium text-sm" htmlFor="category">
              Category
            </label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:font-medium file:text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              id="category"
              onChange={(e) => setCategory(e.target.value as Category)}
              value={category}
            >
              {SUPPORT_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="font-medium text-sm" htmlFor="description">
              Description
            </label>
            <Textarea
              id="description"
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your issue in detail"
              required
              rows={5}
              value={description}
            />
          </div>

          <Button disabled={createTicket.isPending} type="submit">
            {createTicket.isPending ? "Submitting..." : "Submit Ticket"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
