import type z from "zod";
import type { Topic } from "./topic.js";
import type { Context, Driver } from "./types.js";

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
  ) {
    void this.subscribe(topic);
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
    if (this.done) {
      return { value: undefined, done: true };
    }

    if (this.queue.length > 0) {
      const value = this.queue.shift();
      if (value !== undefined) {
        return { value, done: false };
      }
    }

    return new Promise((resolve) => {
      this.waiters.push(resolve);
    });
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
