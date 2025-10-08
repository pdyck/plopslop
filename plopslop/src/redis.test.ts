import { beforeEach, describe, expect, it, vi } from "vitest";
import { type RedisClient, RedisDriver } from "./redis.js";

// Mock ioredis
vi.mock("ioredis", () => {
  const { EventEmitter } = require("node:events");

  class MockRedis extends EventEmitter {
    connect = vi.fn().mockResolvedValue(undefined);
    disconnect = vi.fn().mockResolvedValue(undefined);
    publish = vi.fn().mockResolvedValue(1);
    subscribe = vi.fn().mockResolvedValue(undefined);
    unsubscribe = vi.fn().mockResolvedValue(undefined);
  }

  return { Redis: MockRedis };
});

describe("RedisDriver", () => {
  let driver: RedisDriver;
  let publisherMock: RedisClient;
  let subscriberMock: RedisClient;

  beforeEach(() => {
    driver = new RedisDriver();

    // biome-ignore lint/suspicious/noExplicitAny: access private client
    publisherMock = (driver as any).publisher;
    // biome-ignore lint/suspicious/noExplicitAny: access private client
    subscriberMock = (driver as any).subscriber;
  });

  it("should connect to Redis", async () => {
    await driver.connect();

    expect(publisherMock.connect).toHaveBeenCalled();
    expect(subscriberMock.connect).toHaveBeenCalled();
  });

  it("should not connect twice", async () => {
    await driver.connect();
    await driver.connect();

    expect(publisherMock.connect).toHaveBeenCalledTimes(1);
    expect(subscriberMock.connect).toHaveBeenCalledTimes(1);
  });

  it("should disconnect from Redis", async () => {
    await driver.connect();
    await driver.disconnect();

    expect(publisherMock.disconnect).toHaveBeenCalled();
    expect(subscriberMock.disconnect).toHaveBeenCalled();
  });

  it("should publish messages", async () => {
    await driver.publish("test-topic", "test message");

    expect(publisherMock.publish).toHaveBeenCalledWith(
      "test-topic",
      "test message",
    );
  });

  it("should subscribe to topics and receive messages", async () => {
    const handler = vi.fn();

    await driver.subscribe("test-topic", handler);

    // Simulate Redis message
    subscriberMock.emit("message", "test-topic", "hello");

    expect(subscriberMock.subscribe).toHaveBeenCalledWith("test-topic");
    expect(handler).toHaveBeenCalledWith("hello");
  });

  it("should support multiple handlers for the same topic", async () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();

    await driver.subscribe("test-topic", handler1);
    await driver.subscribe("test-topic", handler2);

    subscriberMock.emit("message", "test-topic", "message");

    expect(handler1).toHaveBeenCalledWith("message");
    expect(handler2).toHaveBeenCalledWith("message");
    // Should only subscribe once to Redis for same topic
    expect(subscriberMock.subscribe).toHaveBeenCalledTimes(1);
  });

  it("should unsubscribe from topics", async () => {
    const handler = vi.fn();

    const subId = await driver.subscribe("test-topic", handler);
    await driver.unsubscribe(subId);

    subscriberMock.emit("message", "test-topic", "message");

    expect(handler).not.toHaveBeenCalled();
    expect(subscriberMock.unsubscribe).toHaveBeenCalledWith("test-topic");
  });

  it("should not unsubscribe from Redis if other handlers exist", async () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();

    const subId1 = await driver.subscribe("test-topic", handler1);
    await driver.subscribe("test-topic", handler2);

    await driver.unsubscribe(subId1);

    // Should not unsubscribe from Redis yet
    expect(subscriberMock.unsubscribe).not.toHaveBeenCalled();

    // handler2 should still receive messages
    subscriberMock.emit("message", "test-topic", "message");
    expect(handler1).not.toHaveBeenCalled();
    expect(handler2).toHaveBeenCalledWith("message");
  });

  it("should handle unsubscribe with non-existent subscription ID", async () => {
    await expect(driver.unsubscribe("non-existent")).resolves.not.toThrow();
  });

  it("should isolate topics", async () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();

    await driver.subscribe("topic-1", handler1);
    await driver.subscribe("topic-2", handler2);

    subscriberMock.emit("message", "topic-1", "message for topic 1");

    expect(handler1).toHaveBeenCalledWith("message for topic 1");
    expect(handler2).not.toHaveBeenCalled();
  });

  it("should return unique subscription IDs", async () => {
    const handler = vi.fn();

    const sub1 = await driver.subscribe("topic", handler);
    const sub2 = await driver.subscribe("topic", handler);

    expect(sub1).not.toBe(sub2);
  });
});
