import { QueryClient } from "@tanstack/react-query";
import { httpBatchLink, httpLink, loggerLink, splitLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "~/server/router";

export const trpc = createTRPCReact<AppRouter>();

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 1000,
    },
  },
});

export const trpcClient = trpc.createClient({
  links: [
    loggerLink({
      enabled: (opts) =>
        process.env.NODE_ENV === "development" ||
        (opts.direction === "down" && opts.result instanceof Error),
    }),
    splitLink({
      condition: (op) => op.type === "subscription",
      true: httpLink({
        url: `${typeof window !== "undefined" ? window.location.origin : ""}/api/rpc`,
      }),
      false: httpBatchLink({
        url: `${typeof window !== "undefined" ? window.location.origin : ""}/api/rpc`,
      }),
    }),
  ],
});
