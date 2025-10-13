import type z from "zod";
import { eventEmitter } from "./event-emitter.js";
import { PluginChain } from "./plugin-chain.js";
import { Topic } from "./topic.js";
import type { PubSub, PubSubOptions, TopicDefinition } from "./types.js";

export function createPubSub<
  TTopics extends Record<string, TopicDefinition<z.ZodType>>,
  TContext extends z.ZodType = z.ZodNever,
>({
  driver = eventEmitter(),
  plugins = [],
  topics,
  context,
}: PubSubOptions<TTopics, TContext>): PubSub<TTopics, TContext> {
  const pubsub: Record<string, Topic<z.ZodType, TContext>> = {};
  const pluginChain = new PluginChain<TContext>(plugins);

  for (const [key, definition] of Object.entries(topics)) {
    pubsub[key] = new Topic(driver, definition, pluginChain, context);
  }

  return pubsub as PubSub<TTopics, TContext>;
}
