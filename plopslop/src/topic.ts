import { z } from "zod";
import type { PluginChain } from "./plugin-chain.js";
import { TopicIterator } from "./topic-iterator.js";
import type {
  Context,
  Driver,
  MessageHandler,
  TopicDefinition,
} from "./types.js";

export class Topic<TSchema extends z.ZodType> {
  constructor(
    private readonly driver: Driver,
    private readonly def: TopicDefinition<TSchema>,
    private readonly pluginChain: PluginChain,
  ) {}

  async publish(payload: z.infer<TSchema>): Promise<void> {
    const context: Context = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      topic: this.def.name,
    };

    const validatedPayload = this.def.schema.parse(payload);

    await this.pluginChain.publish(validatedPayload, context, async () => {
      const message = JSON.stringify({ payload: validatedPayload, context });
      await this.driver.publish(this.def.name, message);
      return undefined;
    });
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
    const wrapped = async (message: string) => {
      try {
        const { payload, context } = this.parse(message);
        await this.pluginChain.subscribe(payload, context, async () => {
          handler(payload, context);
          return undefined;
        });
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

  parse(message: string): {
    payload: z.infer<TSchema>;
    context: Context;
  } {
    const parsed = JSON.parse(message);

    if (!("payload" in parsed) || !("context" in parsed)) {
      throw new Error("Invalid message format: missing payload or context");
    }

    const payload = this.def.schema.parse(parsed.payload);

    const contextSchema = z
      .object({
        id: z.string(),
        timestamp: z.number(),
        topic: z.string(),
      })
      .loose();

    contextSchema.parse(parsed.context);

    return {
      payload,
      context: parsed.context as Context,
    };
  }
}
