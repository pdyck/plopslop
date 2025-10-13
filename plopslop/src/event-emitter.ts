import { EventEmitter } from "node:events";
import type { Driver } from "./types.js";

export class EventEmitterDriver implements Driver {
  private emitter: EventEmitter;
  private subscriptions: Map<
    string,
    { topic: string; handler: (message: string) => void | Promise<void> }
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

  async publish(topic: string, message: string): Promise<void> {
    this.emitter.emit(topic, message);
  }

  async subscribe(
    topic: string,
    handler: (message: string) => void | Promise<void>,
  ): Promise<string> {
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

export function eventEmitter() {
  return new EventEmitterDriver();
}
