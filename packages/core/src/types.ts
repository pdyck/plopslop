import type z from "zod";
import type { Topic } from "./topic.js";

export interface Context {
  id: string;
  timestamp: number;
  topic: string;
  [key: string]: unknown;
}

export type Message<TPayload extends z.ZodType> = {
  payload: z.infer<TPayload>;
  context: Context;
};

export type MessageHandler<TPayload = unknown> = (
  payload: TPayload,
  context: Context,
) => void;

export type MessageFilter<TPayload extends z.ZodType> = (
  payload: z.infer<TPayload>,
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

export interface PubSubOptions<
  TTopics extends Record<string, TopicDefinition<z.ZodType>>,
> {
  driver?: Driver;
  plugins?: Plugin[];
  topics: TTopics;
}

export type PubSub<TTopics extends Record<string, TopicDefinition<z.ZodType>>> =
  {
    [K in keyof TTopics]: Topic<TTopics[K]["schema"]>;
  };

export interface IteratorOptions<TSchema extends z.ZodType> {
  /**
   * AbortSignal to cancel the iteration and unsubscribe
   */
  signal?: AbortSignal;

  /**
   * Filter function - only messages that pass will be yielded.
   * Supports both sync and async predicates.
   * If filter throws, message is skipped and error is logged.
   */
  filter?: MessageFilter<TSchema>;
}
