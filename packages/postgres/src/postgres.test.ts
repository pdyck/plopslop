import type { Client } from "pg";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PostgresDriver } from "./postgres.js";

// Mock pg
vi.mock("pg", () => {
  const { EventEmitter } = require("node:events");

  class MockClient extends EventEmitter {
    connect = vi.fn().mockResolvedValue(undefined);
    end = vi.fn().mockResolvedValue(undefined);
    query = vi.fn().mockResolvedValue({ rows: [] });
  }

  return {
    Client: MockClient,
    escapeIdentifier: (str: string) => `"${str.replace(/"/g, '""')}"`,
    escapeLiteral: (str: string) => `'${str.replace(/'/g, "''")}'`,
  };
});

describe("PostgresDriver", () => {
  let driver: PostgresDriver;
  let clientMock: Client;

  beforeEach(() => {
    driver = new PostgresDriver();

    // biome-ignore lint/suspicious/noExplicitAny: access private client
    clientMock = (driver as any).client;
  });

  it("should connect to PostgreSQL", async () => {
    await driver.connect();

    expect(clientMock.connect).toHaveBeenCalled();
  });

  it("should not connect twice", async () => {
    await driver.connect();
    await driver.connect();

    expect(clientMock.connect).toHaveBeenCalledTimes(1);
  });

  it("should disconnect from PostgreSQL", async () => {
    await driver.connect();
    await driver.disconnect();

    expect(clientMock.end).toHaveBeenCalled();
  });

  it("should publish messages using NOTIFY", async () => {
    await driver.publish("test-topic", "test message");

    expect(clientMock.query).toHaveBeenCalledWith(
      "NOTIFY \"test-topic\", 'test message'",
    );
  });

  it("should subscribe to topics and receive notifications", async () => {
    const handler = vi.fn();

    await driver.subscribe("test-topic", handler);

    expect(clientMock.query).toHaveBeenCalledWith('LISTEN "test-topic"');

    // Simulate PostgreSQL notification
    clientMock.emit("notification", {
      channel: "test-topic",
      payload: "hello",
    });

    expect(handler).toHaveBeenCalledWith("hello");
  });

  it("should support multiple handlers for the same topic", async () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();

    await driver.subscribe("test-topic", handler1);
    await driver.subscribe("test-topic", handler2);

    clientMock.emit("notification", {
      channel: "test-topic",
      payload: "message",
    });

    expect(handler1).toHaveBeenCalledWith("message");
    expect(handler2).toHaveBeenCalledWith("message");
    // Should only LISTEN once to PostgreSQL for same topic
    expect(clientMock.query).toHaveBeenCalledTimes(1);
  });

  it("should unsubscribe from topics", async () => {
    const handler = vi.fn();

    const subId = await driver.subscribe("test-topic", handler);
    await driver.unsubscribe(subId);

    clientMock.emit("notification", {
      channel: "test-topic",
      payload: "message",
    });

    expect(handler).not.toHaveBeenCalled();
    expect(clientMock.query).toHaveBeenCalledWith('UNLISTEN "test-topic"');
  });

  it("should not UNLISTEN from PostgreSQL if other handlers exist", async () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();

    const subId1 = await driver.subscribe("test-topic", handler1);
    await driver.subscribe("test-topic", handler2);

    // Clear the query mock calls to check UNLISTEN behavior
    vi.mocked(clientMock.query).mockClear();

    await driver.unsubscribe(subId1);

    // Should not call UNLISTEN yet
    expect(clientMock.query).not.toHaveBeenCalled();

    // handler2 should still receive messages
    clientMock.emit("notification", {
      channel: "test-topic",
      payload: "message",
    });
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

    clientMock.emit("notification", {
      channel: "topic-1",
      payload: "message for topic 1",
    });

    expect(handler1).toHaveBeenCalledWith("message for topic 1");
    expect(handler2).not.toHaveBeenCalled();
  });

  it("should return unique subscription IDs", async () => {
    const handler = vi.fn();

    const sub1 = await driver.subscribe("topic", handler);
    const sub2 = await driver.subscribe("topic", handler);

    expect(sub1).not.toBe(sub2);
  });

  it("should escape identifiers properly", async () => {
    const handler = vi.fn();

    // Subscribe to a topic with special characters
    await driver.subscribe('topic-with-"quotes"', handler);

    // Should escape the identifier
    expect(clientMock.query).toHaveBeenCalledWith(
      'LISTEN "topic-with-""quotes"""',
    );
  });

  it("should handle notifications with undefined payload", async () => {
    const handler = vi.fn();

    await driver.subscribe("test-topic", handler);

    // Simulate notification without payload
    clientMock.emit("notification", {
      channel: "test-topic",
      payload: undefined,
    });

    // Handler should not be called
    expect(handler).not.toHaveBeenCalled();
  });

  it("should handle notifications without channel", async () => {
    const handler = vi.fn();

    await driver.subscribe("test-topic", handler);

    // Simulate malformed notification
    clientMock.emit("notification", {
      payload: "message",
    });

    // Handler should not be called
    expect(handler).not.toHaveBeenCalled();
  });

  it("should use pre-configured client when provided", () => {
    const mockClient = new (require("pg").Client)();
    const customDriver = new PostgresDriver({ client: mockClient });

    // biome-ignore lint/suspicious/noExplicitAny: access private client
    expect((customDriver as any).client).toBe(mockClient);
  });

  it("should accept connection string", () => {
    const connectionString = "postgresql://user:pass@localhost:5432/db";
    const driver = new PostgresDriver(connectionString);

    // Should have created a client (verified by constructor not throwing)
    expect(driver).toBeDefined();
  });
});
