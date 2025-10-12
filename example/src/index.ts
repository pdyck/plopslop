import { createPubSub, redis, topic } from "plopslop";
import { z } from "zod";

const pubsub = createPubSub({
  driver: redis(),
  plugins: [
    {
      name: "logging",
      publish: async (_, __, next) => {
        console.log("Pre publish");
        await next();
        console.log("Post publish");
      },
      subscribe: async (_, __, next) => {
        console.log("Pre process");
        await next();
        console.log("Post process");
      },
    },
  ],
  topics: {
    userCreated: topic({
      name: "user.created",
      schema: z.string(),
    }),
    userUpdated: topic({
      name: "user.updated",
      schema: z.number(),
    }),
  },
});

(async () => {
  for await (const message of pubsub.userCreated.subscribe()) {
    console.log(`async iterator: ${message}`);
  }
})();

setTimeout(() => {
  pubsub.userCreated.publish("User X created!");
  pubsub.userUpdated.publish(42);
}, 1000);
