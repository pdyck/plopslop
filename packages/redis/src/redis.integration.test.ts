import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { RedisDriver } from "./redis.js";

describe("RedisDriver Integration", () => {
  let driver: RedisDriver;

  beforeAll(async () => {
    driver = new RedisDriver({
      host: "localhost",
      port: 6379,
    });
    await driver.connect();
  });

  afterAll(async () => {
    await driver.disconnect();
  });

  it("should publish and receive messages", async () => {
    const handler = vi.fn();
    const subscriptionId = await driver.subscribe("test-channel", handler);

    // Give Redis a moment to establish subscription
    await new Promise((resolve) => setTimeout(resolve, 100));

    await driver.publish("test-channel", "hello world");

    // Give Redis a moment to deliver message
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(handler).toHaveBeenCalledWith("hello world");

    await driver.unsubscribe(subscriptionId);
  });

  it("should support multiple subscribers on same channel", async () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();

    const sub1 = await driver.subscribe("multi-test", handler1);
    const sub2 = await driver.subscribe("multi-test", handler2);

    await new Promise((resolve) => setTimeout(resolve, 100));

    await driver.publish("multi-test", "broadcast message");

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(handler1).toHaveBeenCalledWith("broadcast message");
    expect(handler2).toHaveBeenCalledWith("broadcast message");

    await driver.unsubscribe(sub1);
    await driver.unsubscribe(sub2);
  });

  it("should unsubscribe correctly", async () => {
    const handler = vi.fn();

    const subId = await driver.subscribe("unsub-test", handler);
    await new Promise((resolve) => setTimeout(resolve, 100));

    await driver.publish("unsub-test", "message 1");
    await new Promise((resolve) => setTimeout(resolve, 100));

    await driver.unsubscribe(subId);
    await new Promise((resolve) => setTimeout(resolve, 100));

    await driver.publish("unsub-test", "message 2");
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith("message 1");
  });

  it("should isolate different channels", async () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();

    const sub1 = await driver.subscribe("channel-1", handler1);
    const sub2 = await driver.subscribe("channel-2", handler2);

    await new Promise((resolve) => setTimeout(resolve, 100));

    await driver.publish("channel-1", "message for channel 1");
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(handler1).toHaveBeenCalledWith("message for channel 1");
    expect(handler2).not.toHaveBeenCalled();

    await driver.unsubscribe(sub1);
    await driver.unsubscribe(sub2);
  });

  it("should handle rapid publish/subscribe", async () => {
    const handler = vi.fn();
    const subId = await driver.subscribe("rapid-test", handler);

    await new Promise((resolve) => setTimeout(resolve, 100));

    const messages = ["msg1", "msg2", "msg3", "msg4", "msg5"];
    for (const msg of messages) {
      await driver.publish("rapid-test", msg);
    }

    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(handler).toHaveBeenCalledTimes(5);
    for (const msg of messages) {
      expect(handler).toHaveBeenCalledWith(msg);
    }

    await driver.unsubscribe(subId);
  });
});
