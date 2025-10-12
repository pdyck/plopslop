import { createPubSub, RedisDriver, topic } from "plopslop";
import { z } from "zod";

const pubsub = createPubSub({
  driver: new RedisDriver(),
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
