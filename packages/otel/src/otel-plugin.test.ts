import {
  context,
  propagation,
  type Span,
  SpanKind,
  SpanStatusCode,
  type Tracer,
  trace,
} from "@opentelemetry/api";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { otelPlugin } from "./otel-plugin.js";

// Mock the OpenTelemetry API
vi.mock("@opentelemetry/api", async () => {
  const actual = await vi.importActual("@opentelemetry/api");
  return {
    ...actual,
    trace: {
      getTracer: vi.fn(),
      setSpan: vi.fn((ctx) => ctx),
    },
    context: {
      active: vi.fn(() => ({})),
      with: vi.fn(async (_, fn) => await fn()),
    },
    propagation: {
      inject: vi.fn(),
      extract: vi.fn((ctx) => ctx),
    },
    SpanKind: actual.SpanKind,
    SpanStatusCode: actual.SpanStatusCode,
  };
});

describe("otelPlugin", () => {
  let mockSpan: Span;
  let mockTracer: Tracer;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Create mock span
    mockSpan = {
      spanContext: vi.fn(),
      setAttribute: vi.fn(),
      setAttributes: vi.fn(),
      addEvent: vi.fn(),
      addLink: vi.fn(),
      addLinks: vi.fn(),
      setStatus: vi.fn(),
      updateName: vi.fn(),
      end: vi.fn(),
      isRecording: vi.fn(() => true),
      recordException: vi.fn(),
    } as unknown as Span;

    // Create mock tracer
    mockTracer = {
      startSpan: vi.fn(() => mockSpan),
      startActiveSpan: vi.fn(),
    } as unknown as Tracer;

    // Setup trace.getTracer to return mock tracer
    vi.mocked(trace.getTracer).mockReturnValue(mockTracer);
  });

  describe("plugin creation", () => {
    it("should create a plugin with name 'otel'", () => {
      const plugin = otelPlugin();

      expect(plugin.name).toBe("otel");
      expect(plugin.publish).toBeDefined();
      expect(plugin.subscribe).toBeDefined();
    });

    it("should get tracer with correct instrumentation name", () => {
      otelPlugin();

      expect(trace.getTracer).toHaveBeenCalledWith("@plopslop/otel");
    });
  });

  describe("publish hook", () => {
    it("should create a span with correct attributes", async () => {
      const plugin = otelPlugin();
      const ctx = {
        id: "msg-123",
        timestamp: Date.now(),
        topic: "test-topic",
      };
      const payload = { data: "test" };
      const next = vi.fn(async () => {});

      await plugin.publish?.(payload, ctx, next);

      expect(mockTracer.startSpan).toHaveBeenCalledWith(
        "plopslop.publish",
        expect.objectContaining({
          kind: SpanKind.PRODUCER,
          attributes: expect.objectContaining({
            "messaging.system": "plopslop",
            "messaging.destination": "test-topic",
            "messaging.message.id": "msg-123",
            "messaging.operation": "publish",
          }),
        }),
      );
    });

    it("should inject trace context into message context", async () => {
      const plugin = otelPlugin();
      const ctx = {
        id: "msg-123",
        timestamp: Date.now(),
        topic: "test-topic",
      };
      const next = vi.fn(async () => {});

      // Mock propagation.inject to add traceparent
      vi.mocked(propagation.inject).mockImplementation((_, carrier) => {
        (carrier as Record<string, string>).traceparent =
          "00-trace-id-span-id-01";
      });

      await plugin.publish?.({}, ctx, next);

      expect(propagation.inject).toHaveBeenCalled();
      expect(ctx).toHaveProperty("traceparent");
    });

    it("should set payload size attribute for objects", async () => {
      const plugin = otelPlugin();
      const ctx = {
        id: "msg-123",
        timestamp: Date.now(),
        topic: "test-topic",
      };
      const payload = { data: "test-data" };
      const next = vi.fn(async () => {});

      await plugin.publish?.(payload, ctx, next);

      expect(mockSpan.setAttribute).toHaveBeenCalledWith(
        "messaging.message.payload_size_bytes",
        expect.any(Number),
      );
    });

    it("should set payload size attribute for strings", async () => {
      const plugin = otelPlugin();
      const ctx = {
        id: "msg-123",
        timestamp: Date.now(),
        topic: "test-topic",
      };
      const payload = "test-message";
      const next = vi.fn(async () => {});

      await plugin.publish?.(payload, ctx, next);

      expect(mockSpan.setAttribute).toHaveBeenCalledWith(
        "messaging.message.payload_size_bytes",
        expect.any(Number),
      );
    });

    it("should call next within span context", async () => {
      const plugin = otelPlugin();
      const ctx = {
        id: "msg-123",
        timestamp: Date.now(),
        topic: "test-topic",
      };
      const next = vi.fn(async () => {});

      await plugin.publish?.({}, ctx, next);

      expect(context.with).toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });

    it("should set span status to OK on success", async () => {
      const plugin = otelPlugin();
      const ctx = {
        id: "msg-123",
        timestamp: Date.now(),
        topic: "test-topic",
      };
      const next = vi.fn(async () => {});

      await plugin.publish?.({}, ctx, next);

      expect(mockSpan.setStatus).toHaveBeenCalledWith({
        code: SpanStatusCode.OK,
      });
    });

    it("should end span after execution", async () => {
      const plugin = otelPlugin();
      const ctx = {
        id: "msg-123",
        timestamp: Date.now(),
        topic: "test-topic",
      };
      const next = vi.fn(async () => {});

      await plugin.publish?.({}, ctx, next);

      expect(mockSpan.end).toHaveBeenCalled();
    });

    it("should record exception and set error status on failure", async () => {
      const plugin = otelPlugin();
      const ctx = {
        id: "msg-123",
        timestamp: Date.now(),
        topic: "test-topic",
      };
      const error = new Error("Test error");
      const next = vi.fn(async () => {
        throw error;
      });

      await expect(plugin.publish?.({}, ctx, next)).rejects.toThrow(
        "Test error",
      );

      expect(mockSpan.recordException).toHaveBeenCalledWith(error);
      expect(mockSpan.setStatus).toHaveBeenCalledWith({
        code: SpanStatusCode.ERROR,
        message: "Test error",
      });
    });

    it("should end span even if error occurs", async () => {
      const plugin = otelPlugin();
      const ctx = {
        id: "msg-123",
        timestamp: Date.now(),
        topic: "test-topic",
      };
      const next = vi.fn(async () => {
        throw new Error("Test error");
      });

      await expect(plugin.publish?.({}, ctx, next)).rejects.toThrow();

      expect(mockSpan.end).toHaveBeenCalled();
    });

    it("should handle non-Error exceptions", async () => {
      const plugin = otelPlugin();
      const ctx = {
        id: "msg-123",
        timestamp: Date.now(),
        topic: "test-topic",
      };
      const next = vi.fn(async () => {
        throw "string error";
      });

      await expect(plugin.publish?.({}, ctx, next)).rejects.toThrow();

      expect(mockSpan.recordException).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe("subscribe hook", () => {
    it("should create a span with correct attributes", async () => {
      const plugin = otelPlugin();
      const ctx = {
        id: "msg-456",
        timestamp: Date.now(),
        topic: "test-topic",
      };
      const payload = { data: "test" };
      const next = vi.fn(async () => {});

      await plugin.subscribe?.(payload, ctx, next);

      expect(mockTracer.startSpan).toHaveBeenCalledWith(
        "plopslop.subscribe",
        expect.objectContaining({
          kind: SpanKind.CONSUMER,
          attributes: expect.objectContaining({
            "messaging.system": "plopslop",
            "messaging.destination": "test-topic",
            "messaging.message.id": "msg-456",
            "messaging.operation": "receive",
          }),
        }),
        expect.anything(),
      );
    });

    it("should extract trace context from message", async () => {
      const plugin = otelPlugin();
      const ctx = {
        id: "msg-456",
        timestamp: Date.now(),
        topic: "test-topic",
        traceparent: "00-trace-id-span-id-01",
      };
      const next = vi.fn(async () => {});

      await plugin.subscribe?.({}, ctx, next);

      expect(propagation.extract).toHaveBeenCalledWith(expect.anything(), ctx);
    });

    it("should set payload size attribute", async () => {
      const plugin = otelPlugin();
      const ctx = {
        id: "msg-456",
        timestamp: Date.now(),
        topic: "test-topic",
      };
      const payload = { data: "received-data" };
      const next = vi.fn(async () => {});

      await plugin.subscribe?.(payload, ctx, next);

      expect(mockSpan.setAttribute).toHaveBeenCalledWith(
        "messaging.message.payload_size_bytes",
        expect.any(Number),
      );
    });

    it("should call next within span context", async () => {
      const plugin = otelPlugin();
      const ctx = {
        id: "msg-456",
        timestamp: Date.now(),
        topic: "test-topic",
      };
      const next = vi.fn(async () => {});

      await plugin.subscribe?.({}, ctx, next);

      expect(context.with).toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });

    it("should set span status to OK on success", async () => {
      const plugin = otelPlugin();
      const ctx = {
        id: "msg-456",
        timestamp: Date.now(),
        topic: "test-topic",
      };
      const next = vi.fn(async () => {});

      await plugin.subscribe?.({}, ctx, next);

      expect(mockSpan.setStatus).toHaveBeenCalledWith({
        code: SpanStatusCode.OK,
      });
    });

    it("should end span after execution", async () => {
      const plugin = otelPlugin();
      const ctx = {
        id: "msg-456",
        timestamp: Date.now(),
        topic: "test-topic",
      };
      const next = vi.fn(async () => {});

      await plugin.subscribe?.({}, ctx, next);

      expect(mockSpan.end).toHaveBeenCalled();
    });

    it("should record exception and set error status on failure", async () => {
      const plugin = otelPlugin();
      const ctx = {
        id: "msg-456",
        timestamp: Date.now(),
        topic: "test-topic",
      };
      const error = new Error("Handler error");
      const next = vi.fn(async () => {
        throw error;
      });

      await expect(plugin.subscribe?.({}, ctx, next)).rejects.toThrow(
        "Handler error",
      );

      expect(mockSpan.recordException).toHaveBeenCalledWith(error);
      expect(mockSpan.setStatus).toHaveBeenCalledWith({
        code: SpanStatusCode.ERROR,
        message: "Handler error",
      });
    });

    it("should end span even if error occurs", async () => {
      const plugin = otelPlugin();
      const ctx = {
        id: "msg-456",
        timestamp: Date.now(),
        topic: "test-topic",
      };
      const next = vi.fn(async () => {
        throw new Error("Handler error");
      });

      await expect(plugin.subscribe?.({}, ctx, next)).rejects.toThrow();

      expect(mockSpan.end).toHaveBeenCalled();
    });
  });

  describe("context propagation", () => {
    it("should propagate trace context from publish to subscribe", async () => {
      const plugin = otelPlugin();

      // Simulate publish adding traceparent
      vi.mocked(propagation.inject).mockImplementation((_, carrier) => {
        (carrier as Record<string, string>).traceparent =
          "00-0123456789abcdef0123456789abcdef-0123456789abcdef-01";
        (carrier as Record<string, string>).tracestate = "vendor=value";
      });

      const publishCtx = {
        id: "msg-1",
        timestamp: Date.now(),
        topic: "test-topic",
      };

      await plugin.publish?.(
        {},
        publishCtx,
        vi.fn(async () => {}),
      );

      // Verify trace context was injected
      expect(publishCtx).toHaveProperty("traceparent");
      expect(publishCtx).toHaveProperty("tracestate");

      // Simulate subscribe extracting the context
      await plugin.subscribe?.(
        {},
        publishCtx,
        vi.fn(async () => {}),
      );

      expect(propagation.extract).toHaveBeenCalledWith(
        expect.anything(),
        publishCtx,
      );
    });
  });
});
