import { httpBatchLink, httpSubscriptionLink, splitLink } from "@trpc/client";
import { createTRPCNext } from "@trpc/next";
import superjson from "superjson";
import type { AppRouter } from "../server";

function getBaseUrl() {
  if (typeof window !== "undefined") {
    return "";
  }
  return `http://localhost:${process.env.PORT ?? 3000}`;
}

export const trpc: ReturnType<typeof createTRPCNext<AppRouter>> =
  createTRPCNext<AppRouter>({
    config() {
      return {
        links: [
          splitLink({
            condition: (op) => op.type === "subscription",
            true: httpSubscriptionLink({
              url: `${getBaseUrl()}/api/trpc`,
              transformer: superjson,
            }),
            false: httpBatchLink({
              url: `${getBaseUrl()}/api/trpc`,
              transformer: superjson,
            }),
          }),
        ],
      };
    },
    ssr: false,
    transformer: superjson,
  });
