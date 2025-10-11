import type z from "zod";
import type { PubSubDriver } from "./driver.js";
import { Topic, type TopicDefinition } from "./topic.js";

export interface PubSubConfig<
  TTopics extends Record<string, TopicDefinition<z.ZodType>>,
> {
  driver: PubSubDriver;
  topics: TTopics;
}

type TopicsRecord<TTopics extends Record<string, TopicDefinition<z.ZodType>>> =
  {
    [K in keyof TTopics]: Topic<TTopics[K]["schema"]>;
  };

export function createPubSub<
  TTopics extends Record<string, TopicDefinition<z.ZodType>>,
>(config: PubSubConfig<TTopics>): TopicsRecord<TTopics> {
  const topics: Record<string, Topic<z.ZodType>> = {};

  for (const [key, definition] of Object.entries(config.topics)) {
    topics[key] = new Topic(config.driver, definition);
  }

  return topics as TopicsRecord<TTopics>;
}
