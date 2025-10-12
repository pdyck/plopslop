import type z from "zod";
import type { Topic } from "./topic.js";
import type { Driver } from "./types.js";

export class TopicIterator<TSchema extends z.ZodType>
  implements AsyncIterableIterator<z.infer<TSchema>>
{
  private readonly queue: z.infer<TSchema>[] = [];
  private readonly waiters: Array<
    (value: IteratorResult<z.infer<TSchema>>) => void
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
    const handler = (message: z.infer<TSchema>) => {
      if (this.done) return;

      if (this.waiters.length > 0) {
        const resolve = this.waiters.shift();
        if (resolve) {
          resolve({ value: message, done: false });
        }
      } else {
        this.queue.push(message);
      }
    };

    this.subscriptionId = await topic.subscribe(handler);
  }

  [Symbol.asyncIterator](): AsyncIterableIterator<z.infer<TSchema>> {
    return this;
  }

  async next(): Promise<IteratorResult<z.infer<TSchema>>> {
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

  async return(): Promise<IteratorResult<z.infer<TSchema>>> {
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
