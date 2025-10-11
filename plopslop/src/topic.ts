import type z from "zod";
import type { MessageHandler, PubSubDriver } from "./driver.js";

export interface TopicDefinition<TSchema extends z.ZodType> {
  name: string;
  schema: TSchema;
}

export function topic<TSchema extends z.ZodType>(
  topic: TopicDefinition<TSchema>,
): TopicDefinition<TSchema> {
  return topic;
}

export class Topic<TSchema extends z.ZodType> {
  constructor(
    private readonly driver: PubSubDriver,
    private readonly def: TopicDefinition<TSchema>,
  ) {}

  async publish(message: z.infer<TSchema>): Promise<void> {
    const validated = this.def.schema.parse(message);
    const serialized = JSON.stringify(validated);
    return this.driver.publish(this.def.name, serialized);
  }

  async subscribe(handler: MessageHandler<z.infer<TSchema>>): Promise<string> {
    const wrapped = (message: string) => {
      try {
        const parsed = JSON.parse(message);
        const validated = this.def.schema.parse(parsed);
        handler(validated);
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
}
