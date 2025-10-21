import { initTRPC } from "@trpc/server";
import { z } from "zod";
import { pubsub } from "./pubsub";

const t = initTRPC.create();

export const router = t.router({
  sendMessage: t.procedure
    .input(
      z.object({
        username: z.string().min(1).max(50),
        message: z.string().min(1).max(500),
      }),
    )
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ input }) => {
      console.log(`New message: ${input.message}`);

      await pubsub.chatMessage.publish({
        username: input.username,
        message: input.message,
        timestamp: Date.now(),
      });

      return { success: true };
    }),

  messages: t.procedure.subscription(async function* () {
    const subscription = pubsub.chatMessage.subscribe();

    for await (const { payload } of subscription) {
      console.log(`SSE new message ${payload.message}`);
      yield payload;
    }
  }),
});

export type AppRouter = typeof router;
