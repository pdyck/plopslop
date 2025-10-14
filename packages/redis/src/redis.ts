import type { Driver } from "@plopslop/core";
import type { Cluster, RedisOptions } from "ioredis";
import { Redis } from "ioredis";

export type RedisClient = Redis | Cluster;

export class RedisDriver implements Driver {
  private publisher: RedisClient;
  private subscriber: RedisClient;
  private subscriptions: Map<
    string,
    { topic: string; handler: (message: string) => void | Promise<void> }
  >;
  private subscriptionCounter: number;
  private connected: boolean;

  constructor(options: RedisOptions = {}) {
    this.publisher = new Redis({ ...options, lazyConnect: true });
    this.subscriber = new Redis({ ...options, lazyConnect: true });
    this.subscriptions = new Map();
    this.subscriptionCounter = 0;
    this.connected = false;

    this.subscriber.on("message", (topic: string, message: string) => {
      for (const sub of this.subscriptions.values()) {
        if (sub.topic === topic) {
          void sub.handler(message);
        }
      }
    });
  }

  async connect(): Promise<void> {
    if (this.connected) {
      return;
    }

    await Promise.all([this.publisher.connect(), this.subscriber.connect()]);
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    if (!this.connected) {
      return;
    }
    await Promise.all([
      this.publisher.disconnect(),
      this.subscriber.disconnect(),
    ]);
    this.subscriptions.clear();
    this.connected = false;
  }

  async publish(topic: string, message: string): Promise<void> {
    await this.publisher.publish(topic, message);
  }

  async subscribe(
    topic: string,
    handler: (message: string) => void | Promise<void>,
  ): Promise<string> {
    const subscriptionId = `redis_sub_${++this.subscriptionCounter}`;

    const topicHasSubscriptions = Array.from(this.subscriptions.values()).some(
      (sub) => sub.topic === topic,
    );

    if (!topicHasSubscriptions) {
      await this.subscriber.subscribe(topic);
    }

    this.subscriptions.set(subscriptionId, { topic, handler });

    return subscriptionId;
  }

  async unsubscribe(subscription: string): Promise<void> {
    const sub = this.subscriptions.get(subscription);
    if (!sub) {
      return;
    }

    this.subscriptions.delete(subscription);

    // Unsubscribe from topic if no more subscriptions for it
    const topicStillHasSubscriptions = Array.from(
      this.subscriptions.values(),
    ).some((s) => s.topic === sub.topic);

    if (!topicStillHasSubscriptions) {
      await this.subscriber.unsubscribe(sub.topic);
    }
  }
}

export function redis(options: RedisOptions = {}) {
  return new RedisDriver(options);
}
