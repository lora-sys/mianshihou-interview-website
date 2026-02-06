"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { trpc } from "./client";

const Toaster = dynamic(() => import("sonner").then((m) => m.Toaster), {
  ssr: false,
});

const DEVICE_COOKIE = "mianshihou.device_id";

function getCookie(name: string) {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  const value = m?.[1];
  return value ? decodeURIComponent(value) : null;
}

function setCookie(name: string, value: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const existing = getCookie(DEVICE_COOKIE);
    if (existing) return;
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    setCookie(DEVICE_COOKIE, id);
  }, []);

  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/trpc",
          fetch(url, options) {
            const deviceId = getCookie(DEVICE_COOKIE);
            return fetch(url, {
              ...options,
              credentials: "include",
              headers: {
                ...(options?.headers ?? {}),
                ...(deviceId ? { "x-device-id": deviceId } : {}),
              },
            });
          },
        }),
      ],
    }),
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster richColors position="top-right" />
      </QueryClientProvider>
    </trpc.Provider>
  );
}
