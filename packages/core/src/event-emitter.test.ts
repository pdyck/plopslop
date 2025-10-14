import { describe, expect, it, vi } from "vitest";
import { EventEmitterDriver } from "./event-emitter.js";

describe("EventEmitterDriver", () => {
  it("should publish and receive messages", async () => {
    const pubsub = new EventEmitterDriver();
    const handler = vi.fn();

    await pubsub.subscribe("test-channel", handler);
    await pubsub.publish("test-channel", "hello world");

    expect(handler).toHaveBeenCalledWith("hello world");
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("should support multiple subscribers on the same channel", async () => {
    const pubsub = new EventEmitterDriver();
    const handler1 = vi.fn();
    const handler2 = vi.fn();

    await pubsub.subscribe("test-channel", handler1);
    await pubsub.subscribe("test-channel", handler2);
    await pubsub.publish("test-channel", "message");

    expect(handler1).toHaveBeenCalledWith("message");
    expect(handler2).toHaveBeenCalledWith("message");
  });

  it("should unsubscribe correctly", async () => {
    const pubsub = new EventEmitterDriver();
    const handler = vi.fn();

    const subscriptionId = await pubsub.subscribe("test-channel", handler);
    await pubsub.publish("test-channel", "message 1");

    await pubsub.unsubscribe(subscriptionId);
    await pubsub.publish("test-channel", "message 2");

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith("message 1");
  });

  it("should handle multiple channels independently", async () => {
    const pubsub = new EventEmitterDriver();
    const handler1 = vi.fn();
    const handler2 = vi.fn();

    await pubsub.subscribe("channel-1", handler1);
    await pubsub.subscribe("channel-2", handler2);

    await pubsub.publish("channel-1", "message for channel 1");
    await pubsub.publish("channel-2", "message for channel 2");

    expect(handler1).toHaveBeenCalledWith("message for channel 1");
    expect(handler1).toHaveBeenCalledTimes(1);
    expect(handler2).toHaveBeenCalledWith("message for channel 2");
    expect(handler2).toHaveBeenCalledTimes(1);
  });

  it("should return unique subscription IDs", async () => {
    const pubsub = new EventEmitterDriver();
    const handler = vi.fn();

    const sub1 = await pubsub.subscribe("channel", handler);
    const sub2 = await pubsub.subscribe("channel", handler);

    expect(sub1).not.toBe(sub2);
  });

  it("should handle unsubscribe with non-existent subscription ID", async () => {
    const pubsub = new EventEmitterDriver();

    await expect(pubsub.unsubscribe("non-existent")).resolves.not.toThrow();
  });
});
