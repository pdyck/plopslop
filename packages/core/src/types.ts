import type z from "zod";
import type { PluginChain } from "./plugin-chain.js";
import type { Topic } from "./topic.js";

export interface Context {
  id: string;
  timestamp: number;
  topic: string;
  [key: string]: unknown;
}

export type Message<TSchema extends z.ZodType> = {
  payload: z.infer<TSchema>;
  context: Context;
};

export type MessageHandler<TSchema extends z.ZodType> = (
  payload: z.infer<TSchema>,
  context: Context,
) => void;

export type MessageFilter<TSchema extends z.ZodType> = (
  payload: z.infer<TSchema>,
  context: Context,
) => boolean | Promise<boolean>;

export interface Driver {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  publish(topic: string, message: string): Promise<void>;
  subscribe(
    topic: string,
    handler: (message: string) => void | Promise<void>,
  ): Promise<string>;
  unsubscribe(subscription: string): Promise<void>;
}

export type PluginHook = <TPayload>(
  payload: TPayload,
  context: Context,
  next: () => Promise<void>,
) => Promise<void>;

export interface Plugin {
  name: string;
  publish?: PluginHook;
  subscribe?: PluginHook;
}

export interface TopicDefinition<TSchema extends z.ZodType> {
  name: string;
  schema: TSchema;
}

export interface TopicOptions<TSchema extends z.ZodType> {
  driver: Driver;
  definition: TopicDefinition<TSchema>;
  pluginChain: PluginChain;
  prefix: string;
}

export interface PubSubOptions<
  TTopics extends Record<string, TopicDefinition<z.ZodType>>,
> {
  driver?: Driver;
  plugins?: Plugin[];
  topics: TTopics;
  prefix?: string;
}

export type PubSub<TTopics extends Record<string, TopicDefinition<z.ZodType>>> =
  {
    [K in keyof TTopics]: Topic<TTopics[K]["schema"]>;
  };

export interface IteratorOptions<TSchema extends z.ZodType> {
  signal?: AbortSignal;
  filter?: MessageFilter<TSchema>;
}
