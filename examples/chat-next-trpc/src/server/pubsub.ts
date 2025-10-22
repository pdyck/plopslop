import { createPubSub } from "@plopslop/core";
import { redis } from "@plopslop/redis";
import { z } from "zod";

export const MessageSchema = z.object({
  username: z.string(),
  message: z.string(),
  timestamp: z.number(),
});

export type Message = z.infer<typeof MessageSchema>;

export const pubsub = createPubSub({
  driver: redis(),
  topics: {
    messageReceived: {
      name: "message.received",
      schema: MessageSchema,
    },
  },
});
