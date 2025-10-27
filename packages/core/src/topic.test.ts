import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { PluginChain } from "./plugin-chain.js";
import { Topic } from "./topic.js";
import { TopicIterator } from "./topic-iterator.js";
import type { Driver } from "./types.js";
import { defineTopic } from "./util.js";

describe("Topic", () => {
  let mockDriver: Driver;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mockDriver = {
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
      publish: vi.fn().mockResolvedValue(undefined),
      subscribe: vi.fn().mockResolvedValue("sub-123"),
      unsubscribe: vi.fn().mockResolvedValue(undefined),
    };

    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe("publish", () => {
    it("should serialize and publish valid messages", async () => {
      const stringSchema = z.string();
      const topicDef = defineTopic({
        name: "test-topic",
        schema: stringSchema,
      });
      const testTopic = new Topic({
        driver: mockDriver,
        definition: topicDef,
        pluginChain: new PluginChain([]),
        prefix: "test",
      });

      await testTopic.publish("hello world");

      expect(mockDriver.publish).toHaveBeenCalledTimes(1);
      const publishCall = (mockDriver.publish as any).mock.calls[0];
      expect(publishCall[0]).toBe("test:test-topic");

      const message = JSON.parse(publishCall[1]);
      expect(message.payload).toBe("hello world");
      expect(message.context).toMatchObject({
        id: expect.any(String),
        timestamp: expect.any(Number),
        topic: "test-topic",
      });
    });

    it("should validate messages against schema before publishing", async () => {
      const numberSchema = z.number();
      const topicDef = defineTopic({
        name: "number-topic",
        schema: numberSchema,
      });
      const testTopic = new Topic({
        driver: mockDriver,
        definition: topicDef,
        pluginChain: new PluginChain([]),
        prefix: "test",
      });

      await testTopic.publish(42);

      const publishCall = (mockDriver.publish as any).mock.calls[0];
      const message = JSON.parse(publishCall[1]);
      expect(message.payload).toBe(42);
      expect(message.context.topic).toBe("number-topic");
    });

    it("should reject invalid messages", async () => {
      const stringSchema = z.string();
      const topicDef = defineTopic({
        name: "test-topic",
        schema: stringSchema,
      });
      const testTopic = new Topic({
        driver: mockDriver,
        definition: topicDef,
        pluginChain: new PluginChain([]),
        prefix: "test",
      });

      await expect(testTopic.publish(123 as any)).rejects.toThrow();
      expect(mockDriver.publish).not.toHaveBeenCalled();
    });

    it("should handle complex object schemas", async () => {
      const userSchema = z.object({
        id: z.number(),
        name: z.string(),
        email: z.string().email(),
      });

      const topicDef = defineTopic({ name: "users", schema: userSchema });
      const testTopic = new Topic({
        driver: mockDriver,
        definition: topicDef,
        pluginChain: new PluginChain([]),
        prefix: "test",
      });

      const user = {
        id: 1,
        name: "John Doe",
        email: "john@example.com",
      };

      await testTopic.publish(user);

      const publishCall = (mockDriver.publish as any).mock.calls[0];
      const message = JSON.parse(publishCall[1]);
      expect(message.payload).toEqual(user);
      expect(message.context.topic).toBe("users");
    });

    it("should handle array schemas", async () => {
      const arraySchema = z.array(z.number());
      const topicDef = defineTopic({ name: "numbers", schema: arraySchema });
      const testTopic = new Topic({
        driver: mockDriver,
        definition: topicDef,
        pluginChain: new PluginChain([]),
        prefix: "test",
      });

      await testTopic.publish([1, 2, 3, 4, 5]);

      const publishCall = (mockDriver.publish as any).mock.calls[0];
      const message = JSON.parse(publishCall[1]);
      expect(message.payload).toEqual([1, 2, 3, 4, 5]);
      expect(message.context.topic).toBe("numbers");
    });

    it("should handle nested schemas", async () => {
      const nestedSchema = z.object({
        user: z.object({
          id: z.number(),
          profile: z.object({
            bio: z.string(),
            age: z.number(),
          }),
        }),
      });

      const topicDef = defineTopic({ name: "nested", schema: nestedSchema });
      const testTopic = new Topic({
        driver: mockDriver,
        definition: topicDef,
        pluginChain: new PluginChain([]),
        prefix: "test",
      });

      const data = {
        user: {
          id: 1,
          profile: {
            bio: "Hello",
            age: 30,
          },
        },
      };

      await testTopic.publish(data);

      const publishCall = (mockDriver.publish as any).mock.calls[0];
      const message = JSON.parse(publishCall[1]);
      expect(message.payload).toEqual(data);
      expect(message.context.topic).toBe("nested");
    });
  });

  describe("subscribe with handler", () => {
    it("should subscribe with handler and return subscription ID", async () => {
      const stringSchema = z.string();
      const topicDef = defineTopic({
        name: "test-topic",
        schema: stringSchema,
      });
      const testTopic = new Topic({
        driver: mockDriver,
        definition: topicDef,
        pluginChain: new PluginChain([]),
        prefix: "test",
      });

      const handler = vi.fn();
      const subId = await testTopic.subscribe(handler);

      expect(subId).toBe("sub-123");
      expect(mockDriver.subscribe).toHaveBeenCalledWith(
        "test:test-topic",
        expect.any(Function),
      );
    });

    it("should parse and validate incoming messages before calling handler", async () => {
      const objectSchema = z.object({
        id: z.number(),
        message: z.string(),
      });

      const topicDef = defineTopic({ name: "messages", schema: objectSchema });
      const testTopic = new Topic({
        driver: mockDriver,
        definition: topicDef,
        pluginChain: new PluginChain([]),
        prefix: "test",
      });

      const handler = vi.fn();
      await testTopic.subscribe(handler);

      // Get the wrapped handler that was passed to driver.subscribe
      const wrappedHandler = (mockDriver.subscribe as any).mock.calls[0][1];

      // Simulate receiving a message with envelope
      const payload = { id: 1, message: "test" };
      const envelope = {
        payload,
        context: { id: "123", timestamp: Date.now(), topic: "messages" },
      };
      await wrappedHandler(JSON.stringify(envelope));

      expect(handler).toHaveBeenCalledWith(
        payload,
        expect.objectContaining({
          id: "123",
          topic: "messages",
          timestamp: expect.any(Number),
        }),
      );
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it("should only call handler with validated messages", async () => {
      const numberSchema = z.number();
      const topicDef = defineTopic({ name: "numbers", schema: numberSchema });
      const testTopic = new Topic({
        driver: mockDriver,
        definition: topicDef,
        pluginChain: new PluginChain([]),
        prefix: "test",
      });

      const handler = vi.fn();
      await testTopic.subscribe(handler);

      const wrappedHandler = (mockDriver.subscribe as any).mock.calls[0][1];

      // Valid message
      const validEnvelope = {
        payload: 42,
        context: { id: "123", timestamp: Date.now(), topic: "numbers" },
      };
      await wrappedHandler(JSON.stringify(validEnvelope));
      expect(handler).toHaveBeenCalledWith(42, expect.any(Object));

      // Invalid message
      const invalidEnvelope = {
        payload: "not a number",
        context: { id: "124", timestamp: Date.now(), topic: "numbers" },
      };
      await wrappedHandler(JSON.stringify(invalidEnvelope));
      expect(handler).toHaveBeenCalledTimes(1); // Still only called once
    });
  });

  describe("unsubscribe", () => {
    it("should call driver.unsubscribe with subscription ID", async () => {
      const stringSchema = z.string();
      const topicDef = defineTopic({
        name: "test-topic",
        schema: stringSchema,
      });
      const testTopic = new Topic({
        driver: mockDriver,
        definition: topicDef,
        pluginChain: new PluginChain([]),
        prefix: "test",
      });

      await testTopic.unsubscribe("sub-456");

      expect(mockDriver.unsubscribe).toHaveBeenCalledWith("sub-456");
      expect(mockDriver.unsubscribe).toHaveBeenCalledTimes(1);
    });

    it("should properly delegate to driver", async () => {
      const stringSchema = z.string();
      const topicDef = defineTopic({
        name: "test-topic",
        schema: stringSchema,
      });
      const testTopic = new Topic({
        driver: mockDriver,
        definition: topicDef,
        pluginChain: new PluginChain([]),
        prefix: "test",
      });

      const mockUnsubscribe = vi.fn().mockResolvedValue(undefined);
      mockDriver.unsubscribe = mockUnsubscribe;

      await testTopic.unsubscribe("test-sub");

      expect(mockUnsubscribe).toHaveBeenCalledWith("test-sub");
    });
  });

  describe("integration scenarios", () => {
    it("should handle publish and subscribe flow end-to-end", async () => {
      const messageSchema = z.object({
        id: z.number(),
        text: z.string(),
      });

      const topicDef = defineTopic({ name: "chat", schema: messageSchema });
      const testTopic = new Topic({
        driver: mockDriver,
        definition: topicDef,
        pluginChain: new PluginChain([]),
        prefix: "test",
      });

      const handler = vi.fn();
      await testTopic.subscribe(handler);

      const wrappedHandler = (mockDriver.subscribe as any).mock.calls[0][1];

      // Publish message
      const message = { id: 1, text: "Hello" };
      await testTopic.publish(message);

      // Simulate receiving the message
      const publishedMessage = (mockDriver.publish as any).mock.calls[0][1];
      await wrappedHandler(publishedMessage);

      expect(handler).toHaveBeenCalledWith(
        message,
        expect.objectContaining({
          id: expect.any(String),
          timestamp: expect.any(Number),
          topic: "chat",
        }),
      );
    });

    it("should support multiple subscribers on same topic", async () => {
      const stringSchema = z.string();
      const topicDef = defineTopic({
        name: "test-topic",
        schema: stringSchema,
      });
      const testTopic = new Topic({
        driver: mockDriver,
        definition: topicDef,
        pluginChain: new PluginChain([]),
        prefix: "test",
      });

      const handler1 = vi.fn();
      const handler2 = vi.fn();

      mockDriver.subscribe = vi
        .fn()
        .mockResolvedValueOnce("sub-1")
        .mockResolvedValueOnce("sub-2");

      const sub1 = await testTopic.subscribe(handler1);
      const sub2 = await testTopic.subscribe(handler2);

      expect(sub1).toBe("sub-1");
      expect(sub2).toBe("sub-2");
      expect(mockDriver.subscribe).toHaveBeenCalledTimes(2);
    });

    it("should maintain schema validation throughout the flow", async () => {
      const strictSchema = z.object({
        id: z.number().positive(),
        email: z.string().email(),
      });

      const topicDef = defineTopic({ name: "users", schema: strictSchema });
      const testTopic = new Topic({
        driver: mockDriver,
        definition: topicDef,
        pluginChain: new PluginChain([]),
        prefix: "test",
      });

      const handler = vi.fn();
      await testTopic.subscribe(handler);

      const wrappedHandler = (mockDriver.subscribe as any).mock.calls[0][1];

      // Valid data
      const validUser = { id: 1, email: "test@example.com" };
      await testTopic.publish(validUser);
      const publishedMessage = (mockDriver.publish as any).mock.calls[0][1];
      await wrappedHandler(publishedMessage);
      expect(handler).toHaveBeenCalledWith(validUser, expect.any(Object));

      // Invalid data - negative id
      await expect(
        testTopic.publish({ id: -1, email: "test@example.com" } as any),
      ).rejects.toThrow();

      // Invalid data - bad email
      const invalidEnvelope = {
        payload: { id: 2, email: "not-an-email" },
        context: { id: "123", timestamp: Date.now(), topic: "users" },
      };
      await wrappedHandler(JSON.stringify(invalidEnvelope));
      expect(handler).toHaveBeenCalledTimes(1); // Still only called once
    });

    it("should handle errors without breaking subscriptions", async () => {
      const stringSchema = z.string();
      const topicDef = defineTopic({
        name: "test-topic",
        schema: stringSchema,
      });
      const testTopic = new Topic({
        driver: mockDriver,
        definition: topicDef,
        pluginChain: new PluginChain([]),
        prefix: "test",
      });

      const handler = vi.fn();
      await testTopic.subscribe(handler);

      const wrappedHandler = (mockDriver.subscribe as any).mock.calls[0][1];

      // Send invalid message
      const invalidEnvelope = {
        payload: 123,
        context: { id: "123", timestamp: Date.now(), topic: "test-topic" },
      };
      await wrappedHandler(JSON.stringify(invalidEnvelope));
      expect(handler).not.toHaveBeenCalled();

      // Send valid message - subscription should still work
      const validEnvelope = {
        payload: "valid message",
        context: { id: "124", timestamp: Date.now(), topic: "test-topic" },
      };
      await wrappedHandler(JSON.stringify(validEnvelope));
      expect(handler).toHaveBeenCalledWith("valid message", expect.any(Object));
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it("should handle subscription lifecycle", async () => {
      const stringSchema = z.string();
      const topicDef = defineTopic({
        name: "test-topic",
        schema: stringSchema,
      });
      const testTopic = new Topic({
        driver: mockDriver,
        definition: topicDef,
        pluginChain: new PluginChain([]),
        prefix: "test",
      });

      const handler = vi.fn();

      // Subscribe
      const subId = await testTopic.subscribe(handler);
      expect(subId).toBe("sub-123");

      // Unsubscribe
      await testTopic.unsubscribe(subId);
      expect(mockDriver.unsubscribe).toHaveBeenCalledWith(subId);
    });
  });

  describe("stream() method", () => {
    it("should return TopicIterator", () => {
      const stringSchema = z.string();
      const topicDef = defineTopic({
        name: "test-topic",
        schema: stringSchema,
      });
      const testTopic = new Topic({
        driver: mockDriver,
        definition: topicDef,
        pluginChain: new PluginChain([]),
        prefix: "test",
      });

      const iterator = testTopic.stream();

      expect(iterator).toBeInstanceOf(TopicIterator);
      expect(iterator[Symbol.asyncIterator]).toBeDefined();
    });

    it("should pass options to TopicIterator", async () => {
      const stringSchema = z.string();
      const topicDef = defineTopic({
        name: "test-topic",
        schema: stringSchema,
      });
      const testTopic = new Topic({
        driver: mockDriver,
        definition: topicDef,
        pluginChain: new PluginChain([]),
        prefix: "test",
      });

      const controller = new AbortController();
      const filter = vi.fn().mockReturnValue(true);

      const iterator = testTopic.stream({
        signal: controller.signal,
        filter,
      });

      expect(iterator).toBeInstanceOf(TopicIterator);
    });

    it("should work with for-await-of", async () => {
      const stringSchema = z.string();
      const topicDef = defineTopic({
        name: "test-topic",
        schema: stringSchema,
      });
      const testTopic = new Topic({
        driver: mockDriver,
        definition: topicDef,
        pluginChain: new PluginChain([]),
        prefix: "test",
      });

      // Mock subscribe to immediately call handler
      let handler: any;
      mockDriver.subscribe = vi.fn().mockImplementation((_, h) => {
        handler = h;
        return Promise.resolve("sub-123");
      });

      const iterator = testTopic.stream();

      // Wait for subscription to complete
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Simulate message
      const envelope = {
        payload: "test",
        context: { id: "1", timestamp: Date.now(), topic: "test-topic" },
      };
      handler(JSON.stringify(envelope));

      const result = await iterator.next();
      expect(result.done).toBe(false);
      expect(result.value?.payload).toBe("test");

      await iterator.return();
    });
  });
});
