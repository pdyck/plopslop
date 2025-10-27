import { createPubSub, type Driver, eventEmitter } from "@plopslop/core";
import { otelPlugin } from "@plopslop/otel";
import { postgres } from "@plopslop/postgres";
import { redis } from "@plopslop/redis";
import { z } from "zod";

export const MessageSchema = z.object({
  username: z.string(),
  message: z.string(),
  timestamp: z.number(),
});

export type Message = z.infer<typeof MessageSchema>;

let driver: Driver;
console.log(
  `Plopslop Driver is "${process.env.PLOPSLOP_DRIVER ?? "EventEmitter"}"`,
);

switch (process.env.PLOPSLOP_DRIVER) {
  case "postgres":
    driver = postgres(
      "postgres://postgres:postgres@localhost:5432/plopslop_test",
    );
    break;
  case "redis":
    driver = redis();
    break;
  default:
    driver = eventEmitter();
    break;
}

export const pubsub = createPubSub({
  driver,
  plugins: [otelPlugin()],
  topics: {
    messageReceived: {
      name: "message.received",
      schema: MessageSchema,
    },
  },
});
