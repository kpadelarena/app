"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { ConfirmProvider } from "@/components/ui/ConfirmDialog";

export function Providers({ children }: { children: ReactNode }) {
  // One client per browser tab, created once.
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          // Realtime events invalidate what changed, so data can stay fresh for a while on its own.
          queries: { staleTime: 30_000, retry: 1 },
        },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <ConfirmProvider>{children}</ConfirmProvider>
    </QueryClientProvider>
  );
}
