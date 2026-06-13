import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { authClient } from "@/lib/auth-client";

import { RecommendationFeed } from "./recommendation-feed";

export default async function RecommendationsPage() {
  const session = await authClient.getSession({
    fetchOptions: {
      headers: await headers(),
      throw: true,
    },
  });

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="container mx-auto max-w-5xl px-4 py-6">
      <h1 className="mb-2 font-bold text-2xl">Recommended for You</h1>
      <p className="mb-6 text-muted-foreground">
        Personalized content based on your CEFR level and interests
      </p>
      <RecommendationFeed />
    </div>
  );
}
