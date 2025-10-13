import type z from "zod";
import type { Topic } from "./topic.js";

export interface BaseContext {
  id: string;
  timestamp: number;
  topic: string;
}

export type Context<TContext extends z.ZodType = z.ZodNever> =
  TContext extends z.ZodNever ? BaseContext : BaseContext & z.infer<TContext>;

export type Message<TPayload extends z.ZodType, TContext extends z.ZodType> = {
  payload: z.infer<TPayload>;
  context: Context<TContext>;
};

export type MessageHandler<
  TPayload = unknown,
  TContext extends z.ZodType = z.ZodNever,
> = (payload: TPayload, context: Context<TContext>) => void;

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

export type PluginHook<TContext extends z.ZodType = z.ZodNever> = <TPayload>(
  payload: TPayload,
  context: Context<TContext>,
  next: () => Promise<void>,
) => Promise<void>;

export interface Plugin<TContext extends z.ZodType = z.ZodNever> {
  name: string;
  publish?: PluginHook<TContext>;
  subscribe?: PluginHook<TContext>;
}

export interface TopicDefinition<TSchema extends z.ZodType> {
  name: string;
  schema: TSchema;
}

export interface PubSubOptions<
  TTopics extends Record<string, TopicDefinition<z.ZodType>>,
  TContext extends z.ZodType = z.ZodNever,
> {
  driver?: Driver;
  context?: TContext;
  plugins?: Plugin<TContext>[];
  topics: TTopics;
}

export type PubSub<
  TTopics extends Record<string, TopicDefinition<z.ZodType>>,
  TContext extends z.ZodType = z.ZodNever,
> = {
  [K in keyof TTopics]: Topic<TTopics[K]["schema"], TContext>;
};
