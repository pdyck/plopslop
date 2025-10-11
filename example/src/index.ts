import { createPubSub, RedisDriver, topic } from "plopslop";
import { z } from "zod";

const pubsub = createPubSub({
  driver: new RedisDriver(),
  topics: {
    userCreated: topic({
      name: "user.created",
      schema: z.string(),
    }),
  },
});

await pubsub.userCreated.subscribe((message) =>
  console.log(`Message received: ${message}`),
);

pubsub.userCreated.publish("User X created!");
