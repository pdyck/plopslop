import type z from "zod";
import { eventEmitter } from "./event-emitter.js";
import { PluginChain } from "./plugin-chain.js";
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
  const pluginChain = new PluginChain(plugins);

  for (const [key, definition] of Object.entries(topics)) {
    pubsub[key] = new Topic(driver, definition, pluginChain);
  }

  return pubsub as PubSub<TTopics>;
}
