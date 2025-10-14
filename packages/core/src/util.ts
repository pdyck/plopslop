import type { z } from "zod";
import type { Plugin, TopicDefinition } from "./types.js";

export function definePlugin(plugin: Plugin): Plugin {
  return plugin;
}

export function defineTopic<TSchema extends z.ZodType>(
  topic: TopicDefinition<TSchema>,
): TopicDefinition<TSchema> {
  return topic;
}
