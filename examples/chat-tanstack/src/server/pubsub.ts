import { createPubSub } from "@plopslop/core";
import { redis } from "@plopslop/redis";
import { z } from "zod";

export const chatMessageSchema = z.object({
  username: z.string(),
  message: z.string(),
  timestamp: z.number(),
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;

export const pubsub = createPubSub({
  driver: redis(),
  topics: {
    chatMessage: {
      name: "chat.message",
      schema: chatMessageSchema,
    },
  },
});
