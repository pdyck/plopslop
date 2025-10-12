import { z } from "zod";
import { Topic, topic } from "./topic.js";
import { TopicIterator } from "./topic-iterator.js";
import type { Driver } from "./types.js";

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
      const topicDef = topic({ name: "test-topic", schema: stringSchema });
      const testTopic = new Topic(mockDriver, topicDef);

      await testTopic.publish("hello world");

      expect(mockDriver.publish).toHaveBeenCalledWith(
        "test-topic",
        JSON.stringify("hello world"),
      );
      expect(mockDriver.publish).toHaveBeenCalledTimes(1);
    });

    it("should validate messages against schema before publishing", async () => {
      const numberSchema = z.number();
      const topicDef = topic({ name: "number-topic", schema: numberSchema });
      const testTopic = new Topic(mockDriver, topicDef);

      await testTopic.publish(42);

      expect(mockDriver.publish).toHaveBeenCalledWith(
        "number-topic",
        JSON.stringify(42),
      );
    });

    it("should reject invalid messages", async () => {
      const stringSchema = z.string();
      const topicDef = topic({ name: "test-topic", schema: stringSchema });
      const testTopic = new Topic(mockDriver, topicDef);

      await expect(testTopic.publish(123 as any)).rejects.toThrow();
      expect(mockDriver.publish).not.toHaveBeenCalled();
    });

    it("should handle complex object schemas", async () => {
      const userSchema = z.object({
        id: z.number(),
        name: z.string(),
        email: z.string().email(),
      });

      const topicDef = topic({ name: "users", schema: userSchema });
      const testTopic = new Topic(mockDriver, topicDef);

      const user = {
        id: 1,
        name: "John Doe",
        email: "john@example.com",
      };

      await testTopic.publish(user);

      expect(mockDriver.publish).toHaveBeenCalledWith(
        "users",
        JSON.stringify(user),
      );
    });

    it("should handle array schemas", async () => {
      const arraySchema = z.array(z.number());
      const topicDef = topic({ name: "numbers", schema: arraySchema });
      const testTopic = new Topic(mockDriver, topicDef);

      await testTopic.publish([1, 2, 3, 4, 5]);

      expect(mockDriver.publish).toHaveBeenCalledWith(
        "numbers",
        JSON.stringify([1, 2, 3, 4, 5]),
      );
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

      const topicDef = topic({ name: "nested", schema: nestedSchema });
      const testTopic = new Topic(mockDriver, topicDef);

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

      expect(mockDriver.publish).toHaveBeenCalledWith(
        "nested",
        JSON.stringify(data),
      );
    });
  });

  describe("subscribe with handler", () => {
    it("should subscribe with handler and return subscription ID", async () => {
      const stringSchema = z.string();
      const topicDef = topic({ name: "test-topic", schema: stringSchema });
      const testTopic = new Topic(mockDriver, topicDef);

      const handler = vi.fn();
      const subId = await testTopic.subscribe(handler);

      expect(subId).toBe("sub-123");
      expect(mockDriver.subscribe).toHaveBeenCalledWith(
        "test-topic",
        expect.any(Function),
      );
    });

    it("should parse and validate incoming messages before calling handler", async () => {
      const objectSchema = z.object({
        id: z.number(),
        message: z.string(),
      });

      const topicDef = topic({ name: "messages", schema: objectSchema });
      const testTopic = new Topic(mockDriver, topicDef);

      const handler = vi.fn();
      await testTopic.subscribe(handler);

      // Get the wrapped handler that was passed to driver.subscribe
      const wrappedHandler = (mockDriver.subscribe as any).mock.calls[0][1];

      // Simulate receiving a message
      const message = { id: 1, message: "test" };
      wrappedHandler(JSON.stringify(message));

      expect(handler).toHaveBeenCalledWith(message);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it("should only call handler with validated messages", async () => {
      const numberSchema = z.number();
      const topicDef = topic({ name: "numbers", schema: numberSchema });
      const testTopic = new Topic(mockDriver, topicDef);

      const handler = vi.fn();
      await testTopic.subscribe(handler);

      const wrappedHandler = (mockDriver.subscribe as any).mock.calls[0][1];

      // Valid message
      wrappedHandler(JSON.stringify(42));
      expect(handler).toHaveBeenCalledWith(42);

      // Invalid message
      wrappedHandler(JSON.stringify("not a number"));
      expect(handler).toHaveBeenCalledTimes(1); // Still only called once
    });

    it("should handle invalid messages gracefully without calling handler", async () => {
      const stringSchema = z.string();
      const topicDef = topic({ name: "test-topic", schema: stringSchema });
      const testTopic = new Topic(mockDriver, topicDef);

      const handler = vi.fn();
      await testTopic.subscribe(handler);

      const wrappedHandler = (mockDriver.subscribe as any).mock.calls[0][1];

      // Send invalid message (wrong type)
      wrappedHandler(JSON.stringify(123));

      expect(handler).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it("should handle JSON parse errors", async () => {
      const stringSchema = z.string();
      const topicDef = topic({ name: "test-topic", schema: stringSchema });
      const testTopic = new Topic(mockDriver, topicDef);

      const handler = vi.fn();
      await testTopic.subscribe(handler);

      const wrappedHandler = (mockDriver.subscribe as any).mock.calls[0][1];

      // Send invalid JSON
      wrappedHandler("invalid json {");

      expect(handler).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it("should handle schema validation errors", async () => {
      const emailSchema = z.email();
      const topicDef = topic({ name: "emails", schema: emailSchema });
      const testTopic = new Topic(mockDriver, topicDef);

      const handler = vi.fn();
      await testTopic.subscribe(handler);

      const wrappedHandler = (mockDriver.subscribe as any).mock.calls[0][1];

      // Valid email
      wrappedHandler(JSON.stringify("test@example.com"));
      expect(handler).toHaveBeenCalledWith("test@example.com");

      // Invalid email format
      wrappedHandler(JSON.stringify("not-an-email"));
      expect(handler).toHaveBeenCalledTimes(1); // Still only called once

      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it("should log errors with topic name", async () => {
      const stringSchema = z.string();
      const topicDef = topic({ name: "my-topic", schema: stringSchema });
      const testTopic = new Topic(mockDriver, topicDef);

      const handler = vi.fn();
      await testTopic.subscribe(handler);

      const wrappedHandler = (mockDriver.subscribe as any).mock.calls[0][1];
      wrappedHandler(JSON.stringify(123)); // Invalid

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("my-topic"),
        expect.anything(),
      );
    });
  });

  describe("subscribe without handler (iterator)", () => {
    it("should return TopicIterator when called without handler", async () => {
      const stringSchema = z.string();
      const topicDef = topic({ name: "test-topic", schema: stringSchema });
      const testTopic = new Topic(mockDriver, topicDef);

      const iterator = testTopic.subscribe();

      expect(iterator).toBeInstanceOf(TopicIterator);
    });

    it("should create iterator with driver and topic", async () => {
      const stringSchema = z.string();
      const topicDef = topic({ name: "test-topic", schema: stringSchema });
      const testTopic = new Topic(mockDriver, topicDef);

      const iterator = testTopic.subscribe();

      expect(iterator).toBeDefined();
      expect(iterator[Symbol.asyncIterator]).toBeDefined();
    });

    it("should be usable as async iterator", async () => {
      const stringSchema = z.string();
      const topicDef = topic({ name: "test-topic", schema: stringSchema });
      const testTopic = new Topic(mockDriver, topicDef);

      const iterator = testTopic.subscribe();

      expect(iterator[Symbol.asyncIterator]()).toBe(iterator);
      expect(typeof iterator.next).toBe("function");
      expect(typeof iterator.return).toBe("function");
    });
  });

  describe("unsubscribe", () => {
    it("should call driver.unsubscribe with subscription ID", async () => {
      const stringSchema = z.string();
      const topicDef = topic({ name: "test-topic", schema: stringSchema });
      const testTopic = new Topic(mockDriver, topicDef);

      await testTopic.unsubscribe("sub-456");

      expect(mockDriver.unsubscribe).toHaveBeenCalledWith("sub-456");
      expect(mockDriver.unsubscribe).toHaveBeenCalledTimes(1);
    });

    it("should properly delegate to driver", async () => {
      const stringSchema = z.string();
      const topicDef = topic({ name: "test-topic", schema: stringSchema });
      const testTopic = new Topic(mockDriver, topicDef);

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

      const topicDef = topic({ name: "chat", schema: messageSchema });
      const testTopic = new Topic(mockDriver, topicDef);

      const handler = vi.fn();
      await testTopic.subscribe(handler);

      const wrappedHandler = (mockDriver.subscribe as any).mock.calls[0][1];

      // Publish message
      const message = { id: 1, text: "Hello" };
      await testTopic.publish(message);

      // Simulate receiving the message
      const publishedMessage = (mockDriver.publish as any).mock.calls[0][1];
      wrappedHandler(publishedMessage);

      expect(handler).toHaveBeenCalledWith(message);
    });

    it("should support multiple subscribers on same topic", async () => {
      const stringSchema = z.string();
      const topicDef = topic({ name: "test-topic", schema: stringSchema });
      const testTopic = new Topic(mockDriver, topicDef);

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
        email: z.email(),
      });

      const topicDef = topic({ name: "users", schema: strictSchema });
      const testTopic = new Topic(mockDriver, topicDef);

      const handler = vi.fn();
      await testTopic.subscribe(handler);

      const wrappedHandler = (mockDriver.subscribe as any).mock.calls[0][1];

      // Valid data
      const validUser = { id: 1, email: "test@example.com" };
      await testTopic.publish(validUser);
      wrappedHandler(JSON.stringify(validUser));
      expect(handler).toHaveBeenCalledWith(validUser);

      // Invalid data - negative id
      await expect(
        testTopic.publish({ id: -1, email: "test@example.com" } as any),
      ).rejects.toThrow();

      // Invalid data - bad email
      wrappedHandler(JSON.stringify({ id: 2, email: "not-an-email" }));
      expect(handler).toHaveBeenCalledTimes(1); // Still only called once
    });

    it("should handle errors without breaking subscriptions", async () => {
      const stringSchema = z.string();
      const topicDef = topic({ name: "test-topic", schema: stringSchema });
      const testTopic = new Topic(mockDriver, topicDef);

      const handler = vi.fn();
      await testTopic.subscribe(handler);

      const wrappedHandler = (mockDriver.subscribe as any).mock.calls[0][1];

      // Send invalid message
      wrappedHandler(JSON.stringify(123));
      expect(handler).not.toHaveBeenCalled();

      // Send valid message - subscription should still work
      wrappedHandler(JSON.stringify("valid message"));
      expect(handler).toHaveBeenCalledWith("valid message");
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it("should handle subscription lifecycle", async () => {
      const stringSchema = z.string();
      const topicDef = topic({ name: "test-topic", schema: stringSchema });
      const testTopic = new Topic(mockDriver, topicDef);

      const handler = vi.fn();

      // Subscribe
      const subId = await testTopic.subscribe(handler);
      expect(subId).toBe("sub-123");

      // Unsubscribe
      await testTopic.unsubscribe(subId);
      expect(mockDriver.unsubscribe).toHaveBeenCalledWith(subId);
    });
  });
});
