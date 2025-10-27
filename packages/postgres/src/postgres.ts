import type { Driver } from "@plopslop/core";
import type { ClientConfig } from "pg";
import { Client, escapeIdentifier, escapeLiteral } from "pg";

export type PostgresDriverConfig =
  | string
  | ClientConfig
  | {
      client: Client;
    };

export class PostgresDriver implements Driver {
  private client: Client;
  private subscriptions: Map<
    string,
    { topic: string; handler: (message: string) => void | Promise<void> }
  >;
  private subscriptionCounter: number;
  private connected: boolean;
  private listenedTopics: Set<string>;
  private ownedClient: boolean;

  constructor(config?: PostgresDriverConfig) {
    if (!config) {
      this.client = new Client();
      this.ownedClient = true;
    } else if (typeof config === "string") {
      this.client = new Client({ connectionString: config });
      this.ownedClient = true;
    } else if ("client" in config) {
      this.client = config.client;
      this.ownedClient = false;
    } else {
      this.client = new Client(config);
      this.ownedClient = true;
    }

    this.subscriptions = new Map();
    this.subscriptionCounter = 0;
    this.connected = false;
    this.listenedTopics = new Set();

    this.client.on("notification", (msg) => {
      if (!msg.channel || msg.payload === undefined) {
        return;
      }

      for (const sub of this.subscriptions.values()) {
        if (sub.topic === msg.channel) {
          void sub.handler(msg.payload);
        }
      }
    });
  }

  async connect(): Promise<void> {
    if (this.connected) {
      return;
    }

    if (this.ownedClient) {
      await this.client.connect();
    }

    this.connected = true;
  }

  async disconnect(): Promise<void> {
    if (!this.connected) {
      return;
    }

    for (const topic of this.listenedTopics) {
      await this.client.query(`UNLISTEN ${escapeIdentifier(topic)}`);
    }
    this.listenedTopics.clear();

    if (this.ownedClient) {
      await this.client.end();
    }

    this.subscriptions.clear();
    this.connected = false;
  }

  async publish(topic: string, message: string): Promise<void> {
    await this.connect();

    await this.client.query(
      `NOTIFY ${escapeIdentifier(topic)}, ${escapeLiteral(message)}`,
    );
  }

  async subscribe(
    topic: string,
    handler: (message: string) => void | Promise<void>,
  ): Promise<string> {
    await this.connect();

    const subscriptionId = `postgres_sub_${++this.subscriptionCounter}`;

    if (!this.listenedTopics.has(topic)) {
      await this.client.query(`LISTEN ${escapeIdentifier(topic)}`);
      this.listenedTopics.add(topic);
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

    if (!topicStillHasSubscriptions && this.listenedTopics.has(sub.topic)) {
      await this.client.query(`UNLISTEN ${escapeIdentifier(sub.topic)}`);
      this.listenedTopics.delete(sub.topic);
    }
  }
}

export function postgres(config?: PostgresDriverConfig) {
  return new PostgresDriver(config);
}
