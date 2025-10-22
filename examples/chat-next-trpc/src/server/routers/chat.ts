import { MessageSchema, pubsub } from "../pubsub";
import { publicProcedure, router } from "../trpc";

export const chatRouter = router({
  sendMessage: publicProcedure
    .input(MessageSchema)
    .mutation(async ({ input }) => {
      await pubsub.messageReceived.publish(input);
      return { success: true };
    }),

  onMessage: publicProcedure.subscription(async function* () {
    for await (const { payload } of pubsub.messageReceived.subscribe()) {
      yield payload;
    }
  }),
});
