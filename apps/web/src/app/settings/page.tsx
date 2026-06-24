import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { authClient } from "@/lib/auth-client";

import AccountStanding from "./account-standing";

export default async function SettingsPage() {
  const { data: session } = await authClient.getSession({
    fetchOptions: {
      headers: await headers(),
      throw: true,
    },
  });

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-6">
      <h1 className="text-3xl font-bold">Settings</h1>
      <AccountStanding />
    </div>
  );
}
