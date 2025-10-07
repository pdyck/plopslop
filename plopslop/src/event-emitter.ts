import { EventEmitter } from "node:events";
import type { MessageHandler, PubSubDriver } from "./driver.js";

export class EventEmitterDriver implements PubSubDriver {
  private emitter: EventEmitter;
  private subscriptions: Map<
    string,
    { topic: string; handler: MessageHandler }
  >;
  private subscriptionCounter: number;

  constructor() {
    this.emitter = new EventEmitter();
    this.subscriptions = new Map();
    this.subscriptionCounter = 0;
  }

  async connect(): Promise<void> {
    return;
  }

  async disconnect(): Promise<void> {
    this.subscriptions.clear();
  }

  async publish(channel: string, message: string): Promise<void> {
    this.emitter.emit(channel, message);
  }

  async subscribe(topic: string, handler: MessageHandler): Promise<string> {
    const subscriptionId = `sub_${++this.subscriptionCounter}`;
    this.subscriptions.set(subscriptionId, { topic, handler });
    this.emitter.on(topic, handler);
    return subscriptionId;
  }

  async unsubscribe(subscription: string): Promise<void> {
    const sub = this.subscriptions.get(subscription);
    if (sub) {
      this.emitter.off(sub.topic, sub.handler);
      this.subscriptions.delete(subscription);
    }
  }
}
