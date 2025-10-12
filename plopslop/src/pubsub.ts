import type z from "zod";
import { eventEmitter } from "./event-emitter.js";
import { Topic } from "./topic.js";
import type { PubSub, PubSubOptions, TopicDefinition } from "./types.js";

export function createPubSub<
  TTopics extends Record<string, TopicDefinition<z.ZodType>>,
>({
  driver = eventEmitter(),
  plugins = [],
  topics,
}: PubSubOptions<TTopics>): PubSub<TTopics> {
  const pubsub: Record<string, Topic<z.ZodType>> = {};

  for (const [key, definition] of Object.entries(topics)) {
    pubsub[key] = new Topic(driver, definition, plugins);
  }

  return pubsub as PubSub<TTopics>;
}
