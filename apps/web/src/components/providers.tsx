"use client";

import { Toaster } from "@community/ui/components/sonner";
import { TokenRefreshProvider } from "@community/ui/components/token-refresh-provider";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { authClient } from "@/lib/auth-client";
import { queryClient } from "@/utils/orpc";

import { SessionGuard } from "./session-guard";
import { ThemeProvider } from "./theme-provider";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      disableTransitionOnChange
      enableSystem
    >
      <QueryClientProvider client={queryClient}>
        <TokenRefreshProvider authClient={authClient}>
          <SessionGuard>{children}</SessionGuard>
        </TokenRefreshProvider>
        <ReactQueryDevtools />
      </QueryClientProvider>
      <Toaster richColors />
    </ThemeProvider>
  );
}
