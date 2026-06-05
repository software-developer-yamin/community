"use client";
import { useQuery } from "@tanstack/react-query";

import type { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

interface DashboardProps {
  session: typeof authClient.$Infer.Session;
}

export default function Dashboard(_props: DashboardProps) {
  const privateData = useQuery(orpc.privateData.queryOptions());

  return <p>API: {privateData.data?.message}</p>;
}
