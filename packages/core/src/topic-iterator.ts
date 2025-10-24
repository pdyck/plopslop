import type z from "zod";
import type { Topic } from "./topic.js";
import type { Context, Driver, IteratorOptions } from "./types.js";

Iterator;

export class TopicIterator<TSchema extends z.ZodType>
  implements
    AsyncIterableIterator<{
      payload: z.infer<TSchema>;
      context: Context;
    }>
{
  private readonly queue: Array<{
    payload: z.infer<TSchema>;
    context: Context;
  }> = [];
  private readonly waiters: Array<
    (
      value: IteratorResult<{
        payload: z.infer<TSchema>;
        context: Context;
      }>,
    ) => void
  > = [];
  private subscriptionId: string | null = null;
  private done = false;

  constructor(
    private readonly driver: Driver,
    topic: Topic<TSchema>,
    private readonly options?: IteratorOptions<TSchema>,
  ) {
    // Handle abort signal
    if (options?.signal) {
      // Check if already aborted
      if (options.signal.aborted) {
        this.done = true;
      } else {
        options.signal.addEventListener("abort", () => {
          void this.cleanup();
        });
      }
    }

    // Only subscribe if not already aborted
    if (!this.done) {
      void this.subscribe(topic);
    }
  }

  private async subscribe(topic: Topic<TSchema>): Promise<void> {
    const handler = (payload: z.infer<TSchema>, context: Context) => {
      if (this.done) return;

      const value = { payload, context };

      if (this.waiters.length > 0) {
        const resolve = this.waiters.shift();
        if (resolve) {
          resolve({ value, done: false });
        }
      } else {
        this.queue.push(value);
      }
    };

    this.subscriptionId = await topic.subscribe(handler);
  }

  [Symbol.asyncIterator](): AsyncIterableIterator<{
    payload: z.infer<TSchema>;
    context: Context;
  }> {
    return this;
  }

  async next(): Promise<
    IteratorResult<{
      payload: z.infer<TSchema>;
      context: Context;
    }>
  > {
    while (true) {
      if (this.done) {
        return { value: undefined, done: true };
      }

      // Get next message from queue or wait for one
      let value: { payload: z.infer<TSchema>; context: Context } | undefined;

      if (this.queue.length > 0) {
        value = this.queue.shift();
      } else {
        // Wait for next message
        value = await new Promise<
          IteratorResult<{ payload: z.infer<TSchema>; context: Context }>
        >((resolve) => {
          this.waiters.push(resolve);
        }).then((result) => {
          if (result.done) return undefined;
          return result.value;
        });
      }

      if (value === undefined) {
        return { value: undefined, done: true };
      }

      // Apply filter if present
      if (this.options?.filter) {
        try {
          const shouldYield = await this.options.filter(
            value.payload,
            value.context,
          );
          if (!shouldYield) {
            // Skip this message and continue to next iteration
            continue;
          }
        } catch (error) {
          console.error(
            `Filter error for topic "${value.context.topic}":`,
            error,
          );
          // Skip this message and continue to next iteration
          continue;
        }
      }

      return { value, done: false };
    }
  }

  async return(): Promise<
    IteratorResult<{
      payload: z.infer<TSchema>;
      context: Context;
    }>
  > {
    await this.cleanup();
    return { value: undefined, done: true };
  }

  private async cleanup(): Promise<void> {
    this.done = true;

    // Unsubscribe from the topic
    if (this.subscriptionId) {
      await this.driver.unsubscribe(this.subscriptionId);
    }

    // Resolve all waiting promises
    while (this.waiters.length > 0) {
      const resolve = this.waiters.shift();
      if (resolve) {
        resolve({ value: undefined, done: true });
      }
    }
  }
}
