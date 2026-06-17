"use client";

import { Button } from "@community/ui/components/button";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";

export default function GoogleSignIn() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleGoogleSignIn = async () => {
    setLoading(true);

    await authClient.signIn.social(
      { provider: "google" },
      {
        onSuccess: () => {
          setLoading(false);
          router.push("/dashboard");
          toast.success("Signed in with Google");
        },
        onError: (error) => {
          console.error("Google sign-in failed", error);
          setLoading(false);
          toast.error(error.error?.message || "Failed to sign in with Google");
        },
      }
    );
  };

  return (
    <div className="mt-4">
      <Button
        className="w-full"
        disabled={loading}
        onClick={handleGoogleSignIn}
        variant="outline"
      >
        {loading ? "Redirecting..." : "Sign In with Google"}
      </Button>
    </div>
  );
}
