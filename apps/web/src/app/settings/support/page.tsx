import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { authClient } from "@/lib/auth-client";

import { CreateTicketForm } from "./create-form";
import { TicketList } from "./ticket-list";

export default async function SupportPage() {
  const { data: session } = await authClient.getSession({
    fetchOptions: { headers: await headers() },
  });

  if (!session) {
    redirect("/");
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-semibold text-2xl tracking-tight">
          Support Tickets
        </h2>
        <p className="mt-1 text-muted-foreground text-sm">
          Submit a support request or check the status of existing tickets.
        </p>
      </div>

      <CreateTicketForm />

      <div>
        <h3 className="mb-4 font-medium text-lg">Your Tickets</h3>
        <TicketList />
      </div>
    </div>
  );
}
