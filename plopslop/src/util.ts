import type { z } from "zod";
import type { Plugin, TopicDefinition } from "./types.js";

export function definePlugin<TContext extends z.ZodType = z.ZodNever>(
  plugin: Plugin<TContext>,
): Plugin<TContext> {
  return plugin;
}

export function defineTopic<TSchema extends z.ZodType>(
  topic: TopicDefinition<TSchema>,
): TopicDefinition<TSchema> {
  return topic;
}
