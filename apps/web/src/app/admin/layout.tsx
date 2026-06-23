import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { authClient } from "@/lib/auth-client";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session } = await authClient.getSession({
    fetchOptions: {
      headers: await headers(),
      throw: true,
    },
  });

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "admin") {
    redirect("/dashboard");
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-6">
      <div className="mb-6">
        <h1 className="font-bold text-2xl">Admin Panel</h1>
        <p className="text-muted-foreground">
          Manage content, users, and analytics
        </p>
      </div>
      {children}
    </div>
  );
}
