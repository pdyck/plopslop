import { createFileRoute } from "@tanstack/react-router";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { router } from "~/server/router";

// Handle function for all HTTP methods
async function handle({ request }: { request: Request }) {
  return fetchRequestHandler({
    endpoint: "/api/rpc",
    req: request,
    router: router,
    createContext: () => ({}),
  });
}

// Export the route with handlers for all relevant HTTP methods
export const Route = createFileRoute("/api/rpc/$")({
  server: {
    handlers: {
      HEAD: handle,
      GET: handle, // Important for subscriptions
      POST: handle,
      PUT: handle,
      PATCH: handle,
      DELETE: handle,
    },
  },
});
