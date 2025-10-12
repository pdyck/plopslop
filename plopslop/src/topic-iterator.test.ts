import type { z } from "zod";
import type { Topic } from "./topic.js";
import { TopicIterator } from "./topic-iterator.js";
import type { Driver } from "./types.js";

describe("TopicIterator", () => {
  let mockDriver: Driver;
  let mockTopic: Topic<z.ZodString>;
  let subscriberHandler: ((message: string) => void) | null = null;

  beforeEach(() => {
    subscriberHandler = null;

    mockDriver = {
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
      publish: vi.fn().mockResolvedValue(undefined),
      subscribe: vi.fn().mockResolvedValue("sub-123"),
      unsubscribe: vi.fn().mockResolvedValue(undefined),
    };

    mockTopic = {
      subscribe: vi.fn().mockImplementation((handler) => {
        subscriberHandler = handler;
        return Promise.resolve("sub-123");
      }),
    } as unknown as Topic<z.ZodString>;
  });

  describe("Basic Iteration", () => {
    it("should iterate over messages from the topic", async () => {
      const iterator = new TopicIterator(mockDriver, mockTopic);

      // Wait for subscription to complete
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Simulate messages arriving
      subscriberHandler?.("message1");
      subscriberHandler?.("message2");
      subscriberHandler?.("message3");

      const results: string[] = [];
      const result1 = await iterator.next();
      if (!result1.done) results.push(result1.value);

      const result2 = await iterator.next();
      if (!result2.done) results.push(result2.value);

      const result3 = await iterator.next();
      if (!result3.done) results.push(result3.value);

      expect(results).toEqual(["message1", "message2", "message3"]);
    });

    it("should properly implement AsyncIterableIterator interface", async () => {
      const iterator = new TopicIterator(mockDriver, mockTopic);

      expect(iterator[Symbol.asyncIterator]).toBeDefined();
      expect(iterator[Symbol.asyncIterator]()).toBe(iterator);
      expect(typeof iterator.next).toBe("function");
      expect(typeof iterator.return).toBe("function");
    });

    it("should work with for-await-of loops", async () => {
      const iterator = new TopicIterator(mockDriver, mockTopic);

      // Wait for subscription to complete
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Queue up messages
      subscriberHandler?.("msg1");
      subscriberHandler?.("msg2");
      subscriberHandler?.("msg3");

      const results: string[] = [];
      let count = 0;

      for await (const message of iterator) {
        results.push(message);
        count++;
        if (count === 3) break; // Stop after 3 messages
      }

      expect(results).toEqual(["msg1", "msg2", "msg3"]);
    });
  });

  describe("Message Queueing", () => {
    it("should queue messages that arrive before iteration starts", async () => {
      const iterator = new TopicIterator(mockDriver, mockTopic);

      // Wait for subscription to complete
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Send messages before calling next()
      subscriberHandler?.("queued1");
      subscriberHandler?.("queued2");
      subscriberHandler?.("queued3");

      // Now consume them
      const result1 = await iterator.next();
      const result2 = await iterator.next();
      const result3 = await iterator.next();

      expect(result1).toEqual({ value: "queued1", done: false });
      expect(result2).toEqual({ value: "queued2", done: false });
      expect(result3).toEqual({ value: "queued3", done: false });
    });

    it("should consume queued messages in FIFO order", async () => {
      const iterator = new TopicIterator(mockDriver, mockTopic);

      await new Promise((resolve) => setTimeout(resolve, 0));

      // Queue messages
      for (let i = 1; i <= 5; i++) {
        subscriberHandler?.(`message${i}`);
      }

      // Consume in order
      const results: string[] = [];
      for (let i = 0; i < 5; i++) {
        const result = await iterator.next();
        if (!result.done) {
          results.push(result.value);
        }
      }

      expect(results).toEqual([
        "message1",
        "message2",
        "message3",
        "message4",
        "message5",
      ]);
    });
  });

  describe("Waiting Mechanism", () => {
    it("should wait for messages when queue is empty", async () => {
      const iterator = new TopicIterator(mockDriver, mockTopic);

      await new Promise((resolve) => setTimeout(resolve, 0));

      // Start waiting for next message
      const nextPromise = iterator.next();

      // Message hasn't arrived yet
      let resolved = false;
      nextPromise.then(() => {
        resolved = true;
      });

      // Wait a bit to ensure it hasn't resolved
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(resolved).toBe(false);

      // Now send a message
      subscriberHandler?.("delayed-message");

      // Should now resolve
      const result = await nextPromise;
      expect(result).toEqual({ value: "delayed-message", done: false });
    });

    it("should resolve waiting promises when messages arrive", async () => {
      const iterator = new TopicIterator(mockDriver, mockTopic);

      await new Promise((resolve) => setTimeout(resolve, 0));

      // Create multiple waiting promises
      const promise1 = iterator.next();
      const promise2 = iterator.next();
      const promise3 = iterator.next();

      // Send messages to resolve them
      subscriberHandler?.("msg1");
      subscriberHandler?.("msg2");
      subscriberHandler?.("msg3");

      const [result1, result2, result3] = await Promise.all([
        promise1,
        promise2,
        promise3,
      ]);

      expect(result1).toEqual({ value: "msg1", done: false });
      expect(result2).toEqual({ value: "msg2", done: false });
      expect(result3).toEqual({ value: "msg3", done: false });
    });

    it("should resolve waiters in FIFO order", async () => {
      const iterator = new TopicIterator(mockDriver, mockTopic);

      await new Promise((resolve) => setTimeout(resolve, 0));

      const results: string[] = [];

      // Create waiters
      const waiter1 = iterator.next().then((r) => {
        if (!r.done) results.push(`w1:${r.value}`);
      });
      const waiter2 = iterator.next().then((r) => {
        if (!r.done) results.push(`w2:${r.value}`);
      });
      const waiter3 = iterator.next().then((r) => {
        if (!r.done) results.push(`w3:${r.value}`);
      });

      // Send messages
      subscriberHandler?.("first");
      subscriberHandler?.("second");
      subscriberHandler?.("third");

      await Promise.all([waiter1, waiter2, waiter3]);

      expect(results).toEqual(["w1:first", "w2:second", "w3:third"]);
    });
  });

  describe("Cleanup and Unsubscription", () => {
    it("should unsubscribe from topic when iterator.return() is called", async () => {
      const iterator = new TopicIterator(mockDriver, mockTopic);

      await new Promise((resolve) => setTimeout(resolve, 0));

      await iterator.return();

      expect(mockDriver.unsubscribe).toHaveBeenCalledWith("sub-123");
      expect(mockDriver.unsubscribe).toHaveBeenCalledTimes(1);
    });

    it("should mark iterator as done after cleanup", async () => {
      const iterator = new TopicIterator(mockDriver, mockTopic);

      await new Promise((resolve) => setTimeout(resolve, 0));

      await iterator.return();

      const result = await iterator.next();
      expect(result).toEqual({ value: undefined, done: true });
    });

    it("should resolve all pending waiters when cleanup happens", async () => {
      const iterator = new TopicIterator(mockDriver, mockTopic);

      await new Promise((resolve) => setTimeout(resolve, 0));

      // Create pending waiters
      const waiter1 = iterator.next();
      const waiter2 = iterator.next();
      const waiter3 = iterator.next();

      // Cleanup before sending messages
      await iterator.return();

      const [result1, result2, result3] = await Promise.all([
        waiter1,
        waiter2,
        waiter3,
      ]);

      expect(result1).toEqual({ value: undefined, done: true });
      expect(result2).toEqual({ value: undefined, done: true });
      expect(result3).toEqual({ value: undefined, done: true });
    });

    it("should trigger cleanup when breaking from for-await loop", async () => {
      const iterator = new TopicIterator(mockDriver, mockTopic);

      await new Promise((resolve) => setTimeout(resolve, 0));

      subscriberHandler?.("msg1");
      subscriberHandler?.("msg2");

      let count = 0;
      for await (const _message of iterator) {
        count++;
        if (count === 1) break;
      }

      expect(mockDriver.unsubscribe).toHaveBeenCalledWith("sub-123");
    });
  });

  describe("Edge Cases", () => {
    it("should ignore messages arriving after iterator is done", async () => {
      const iterator = new TopicIterator(mockDriver, mockTopic);

      await new Promise((resolve) => setTimeout(resolve, 0));

      // Mark as done
      await iterator.return();

      // Try to send message
      subscriberHandler?.("late-message");

      // Should still return done
      const result = await iterator.next();
      expect(result).toEqual({ value: undefined, done: true });
    });

    it("should return done status consistently after cleanup", async () => {
      const iterator = new TopicIterator(mockDriver, mockTopic);

      await new Promise((resolve) => setTimeout(resolve, 0));

      await iterator.return();

      // Call next multiple times
      const result1 = await iterator.next();
      const result2 = await iterator.next();
      const result3 = await iterator.next();

      expect(result1.done).toBe(true);
      expect(result2.done).toBe(true);
      expect(result3.done).toBe(true);
    });

    it("should handle unsubscribe when subscription ID is null", async () => {
      // Create iterator but don't let subscription complete
      const slowTopic = {
        subscribe: vi.fn().mockImplementation(() => {
          return new Promise(() => {}); // Never resolves
        }),
      } as unknown as Topic<z.ZodString>;

      const iterator = new TopicIterator(mockDriver, slowTopic);

      // Call return before subscription completes
      await iterator.return();

      // Should not throw, and unsubscribe should not be called (no ID yet)
      expect(mockDriver.unsubscribe).not.toHaveBeenCalled();
    });

    it("should handle mixed queue and waiting scenarios", async () => {
      const iterator = new TopicIterator(mockDriver, mockTopic);

      await new Promise((resolve) => setTimeout(resolve, 0));

      // Queue some messages
      subscriberHandler?.("queued1");
      subscriberHandler?.("queued2");

      // Consume queued messages
      const result1 = await iterator.next();
      expect(result1.value).toBe("queued1");

      // Start waiting
      const result2 = await iterator.next();
      const waiter = iterator.next();

      // Send message to resolve waiter
      subscriberHandler?.("waited");

      const result3 = await waiter;

      expect(result2.value).toBe("queued2");
      expect(result3.value).toBe("waited");
    });
  });

  describe("Integration with Topic", () => {
    it("should call topic.subscribe() during construction", async () => {
      new TopicIterator(mockDriver, mockTopic);

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockTopic.subscribe).toHaveBeenCalled();
      expect(mockTopic.subscribe).toHaveBeenCalledTimes(1);
    });

    it("should pass handler to topic.subscribe()", async () => {
      new TopicIterator(mockDriver, mockTopic);

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockTopic.subscribe).toHaveBeenCalledWith(expect.any(Function));
    });

    it("should use driver for unsubscription", async () => {
      const iterator = new TopicIterator(mockDriver, mockTopic);

      await new Promise((resolve) => setTimeout(resolve, 0));

      await iterator.return();

      expect(mockDriver.unsubscribe).toHaveBeenCalledWith("sub-123");
    });
  });
});
