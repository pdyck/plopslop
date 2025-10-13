import { createPubSub, redis } from "plopslop";
import { z } from "zod";

const pubsub = createPubSub({
  driver: redis(),
  context: z.object({
    workspaceId: z.string().optional(),
  }),
  plugins: [
    {
      name: "logging",
      publish: async (_, context, next) => {
        console.log(`Publishing ${context.topic}`);
        await next();
      },
      subscribe: async (_, context, next) => {
        console.log(`Receiving ${context.topic}`);
        await next();
      },
    },
  ],
  topics: {
    userCreated: {
      name: "user.created",
      schema: z.object({
        name: z.string(),
      }),
    },
    userUpdated: {
      name: "user.updated",
      schema: z.object({
        userId: z.number(),
      }),
    },
  },
});

(async () => {
  for await (const { payload } of pubsub.userCreated.subscribe()) {
    console.log(`User "${payload.name}" was created.`);
  }
})();

(async () => {
  for await (const { payload } of pubsub.userUpdated.subscribe()) {
    console.log(`User ${payload.userId} was updated.`);
  }
})();

setTimeout(() => {
  pubsub.userCreated.publish({ name: "Peter" }, { workspaceId: "test" });
  pubsub.userUpdated.publish({ userId: 42 });
}, 1000);
