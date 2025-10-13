import { z } from "zod";
import type { PluginChain } from "./plugin-chain.js";
import { TopicIterator } from "./topic-iterator.js";
import type {
  Context,
  Driver,
  MessageHandler,
  TopicDefinition,
} from "./types.js";

export class Topic<
  TSchema extends z.ZodType,
  TContext extends z.ZodType = z.ZodNever,
> {
  constructor(
    private readonly driver: Driver,
    private readonly def: TopicDefinition<TSchema>,
    private readonly pluginChain: PluginChain<TContext>,
    private readonly contextSchema?: TContext,
  ) {}

  async publish(
    payload: z.infer<TSchema>,
    customContext?: z.infer<TContext>,
  ): Promise<void> {
    const baseContext = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      topic: this.def.name,
    };

    if (customContext && this.contextSchema) {
      this.contextSchema.parse(customContext);
    }

    const context = {
      ...(customContext ?? {}),
      ...baseContext,
    } as Context<TContext>;

    const validatedPayload = this.def.schema.parse(payload);

    await this.pluginChain.publish(validatedPayload, context, async () => {
      const message = JSON.stringify({ payload: validatedPayload, context });
      await this.driver.publish(this.def.name, message);
      return undefined;
    });
  }

  subscribe(
    handler: MessageHandler<z.infer<TSchema>, TContext>,
  ): Promise<string>;
  subscribe(): TopicIterator<TSchema, TContext>;
  subscribe(
    handler?: MessageHandler<z.infer<TSchema>, TContext>,
  ): Promise<string> | TopicIterator<TSchema, TContext> {
    if (handler) {
      return this.subscribeWithHandler(handler);
    }

    return new TopicIterator(this.driver, this);
  }

  private async subscribeWithHandler(
    handler: MessageHandler<z.infer<TSchema>, TContext>,
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

  private parse(message: string): {
    payload: z.infer<TSchema>;
    context: Context<TContext>;
  } {
    const parsed = JSON.parse(message);

    if (!("payload" in parsed) || !("context" in parsed)) {
      throw new Error("Invalid message format: missing payload or context");
    }

    const payload = this.def.schema.parse(parsed.payload);

    const baseContextSchema = z.object({
      id: z.string(),
      timestamp: z.number(),
      topic: z.string(),
    });

    baseContextSchema.parse(parsed.context);

    if (this.contextSchema) {
      this.contextSchema.parse(parsed.context);
    }

    return {
      payload,
      context: parsed.context as Context<TContext>,
    };
  }
}
