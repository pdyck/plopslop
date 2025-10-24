import { createPubSub } from "@plopslop/core";
import { otelPlugin } from "@plopslop/otel";
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
  plugins: [otelPlugin()],
  topics: {
    messageReceived: {
      name: "message.received",
      schema: MessageSchema,
    },
  },
});
