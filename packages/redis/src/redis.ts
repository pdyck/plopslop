import type { Driver } from "@plopslop/core";
import type {
  Cluster,
  ClusterNode,
  ClusterOptions,
  RedisOptions,
} from "ioredis";
import { Redis, Cluster as RedisCluster } from "ioredis";

export type RedisClient = Redis | Cluster;

export type RedisDriverConfig =
  | string
  | RedisOptions
  | {
      cluster: ClusterNode[];
      clusterOptions?: ClusterOptions;
    }
  | {
      publisher: RedisClient;
      subscriber: RedisClient;
    };

export class RedisDriver implements Driver {
  private publisher: RedisClient;
  private subscriber: RedisClient;
  private subscriptions: Map<
    string,
    { topic: string; handler: (message: string) => void | Promise<void> }
  >;
  private subscriptionCounter: number;
  private connected: boolean;

  constructor(config?: RedisDriverConfig) {
    // Detect config type and create appropriate clients
    if (!config) {
      // Default: connect to localhost
      this.publisher = new Redis({ lazyConnect: true });
      this.subscriber = new Redis({ lazyConnect: true });
    } else if (typeof config === "string") {
      // Connection string
      this.publisher = new Redis(config, { lazyConnect: true });
      this.subscriber = new Redis(config, { lazyConnect: true });
    } else if ("publisher" in config && "subscriber" in config) {
      // Pre-configured instances
      this.publisher = config.publisher;
      this.subscriber = config.subscriber;
    } else if ("cluster" in config) {
      // Cluster mode
      this.publisher = new RedisCluster(config.cluster, {
        ...config.clusterOptions,
        lazyConnect: true,
      });
      this.subscriber = new RedisCluster(config.cluster, {
        ...config.clusterOptions,
        lazyConnect: true,
      });
    } else {
      // Standard RedisOptions
      this.publisher = new Redis({ ...config, lazyConnect: true });
      this.subscriber = new Redis({ ...config, lazyConnect: true });
    }

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

    const topicStillHasSubscriptions = Array.from(
      this.subscriptions.values(),
    ).some((s) => s.topic === sub.topic);

    if (!topicStillHasSubscriptions) {
      await this.subscriber.unsubscribe(sub.topic);
    }
  }
}

export function redis(config?: RedisDriverConfig) {
  return new RedisDriver(config);
}
