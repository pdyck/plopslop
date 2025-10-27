import type z from "zod";
import type { Topic } from "./topic.js";
import type { Context, Driver, IteratorOptions, Message } from "./types.js";

Iterator;

export class TopicIterator<TSchema extends z.ZodType>
  implements AsyncIterableIterator<Message<TSchema>>
{
  private readonly queue: Array<Message<TSchema>> = [];
  private readonly waiters: Array<
    (value: IteratorResult<Message<TSchema>>) => void
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

  [Symbol.asyncIterator](): AsyncIterableIterator<Message<TSchema>> {
    return this;
  }

  async next(): Promise<IteratorResult<Message<TSchema>>> {
    while (true) {
      if (this.done) {
        return { value: undefined, done: true };
      }

      // Get next message from queue or wait for one
      let value: Message<TSchema> | undefined;

      if (this.queue.length > 0) {
        value = this.queue.shift();
      } else {
        // Wait for next message
        value = await new Promise<IteratorResult<Message<TSchema>>>(
          (resolve) => {
            this.waiters.push(resolve);
          },
        ).then((result) => {
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
        } catch {
          // Silently skip messages that cause filter errors
          continue;
        }
      }

      return { value, done: false };
    }
  }

  async return(): Promise<IteratorResult<Message<TSchema>>> {
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
