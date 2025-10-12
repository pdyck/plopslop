import type z from "zod";
import { TopicIterator } from "./topic-iterator.js";
import type { Driver, MessageHandler, TopicDefinition } from "./types.js";

export class Topic<TSchema extends z.ZodType> {
  constructor(
    private readonly driver: Driver,
    private readonly def: TopicDefinition<TSchema>,
  ) {}

  async publish(message: z.infer<TSchema>): Promise<void> {
    const serialized = this.serialize(message);
    return this.driver.publish(this.def.name, serialized);
  }

  subscribe(handler: MessageHandler<z.infer<TSchema>>): Promise<string>;
  subscribe(): TopicIterator<TSchema>;
  subscribe(
    handler?: MessageHandler<z.infer<TSchema>>,
  ): Promise<string> | TopicIterator<TSchema> {
    if (handler) {
      return this.subscribeWithHandler(handler);
    }

    return new TopicIterator(this.driver, this);
  }

  private async subscribeWithHandler(
    handler: MessageHandler<z.infer<TSchema>>,
  ): Promise<string> {
    const wrapped = (message: string) => {
      try {
        const parsed = this.parse(message);
        handler(parsed);
      } catch (error) {
        console.error(
          `Failed to parse/validate message on topic "${this.def.name}":`,
          error,
        );
      }
    };

    return this.driver.subscribe(this.def.name, wrapped);
  }

  async unsubscribe(subscription: string): Promise<void> {
    return this.driver.unsubscribe(subscription);
  }

  private serialize(message: z.infer<TSchema>) {
    const parsed = this.def.schema.parse(message);
    return JSON.stringify(parsed);
  }

  private parse(message: string) {
    const parsed = JSON.parse(message);
    return this.def.schema.parse(parsed);
  }
}

export function topic<TSchema extends z.ZodType>(
  topic: TopicDefinition<TSchema>,
): TopicDefinition<TSchema> {
  return topic;
}
