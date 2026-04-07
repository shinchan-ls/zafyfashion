"use client";

import { SessionProvider } from "next-auth/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { WishlistProvider } from "./context/WishlistContext";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000,
            gcTime: 10 * 60 * 1000,
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
          },
        },
      })
  );

  return (
    <SessionProvider
      refetchOnWindowFocus={false}   // ✅ STOP session flood
      refetchInterval={0}            // ✅ NO polling
    >
      <QueryClientProvider client={queryClient}>
        <WishlistProvider>{children}</WishlistProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}