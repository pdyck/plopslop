import type z from "zod";
import type { Topic } from "./topic.js";

export type MessageHandler<TMessage = string, TContext = object> = (
  message: TMessage,
  context?: TContext,
) => void;

export interface Driver {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  publish(topic: string, message: string): Promise<void>;
  subscribe(topic: string, handler: MessageHandler): Promise<string>;
  unsubscribe(subscription: string): Promise<void>;
}

export interface Plugin {
  name: string;
  publish?: (
    message: string,
    context: Record<string, unknown>,
    next: () => Promise<void>,
  ) => Promise<void>;
  subscribe?: (
    message: string,
    context: Record<string, unknown>,
    next: () => Promise<void>,
  ) => Promise<void>;
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
