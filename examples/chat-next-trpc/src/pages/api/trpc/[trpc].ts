import { createNextApiHandler } from "@trpc/server/adapters/next";
import { appRouter } from "../../../server";

export default createNextApiHandler({
  router: appRouter,
  createContext: () => ({}),
});
