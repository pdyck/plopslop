import {
  context,
  propagation,
  type Span,
  SpanKind,
  SpanStatusCode,
  type Tracer,
  trace,
} from "@opentelemetry/api";
import type { Context, Plugin, PluginHook } from "@plopslop/core";

const INSTRUMENTATION_NAME = "@plopslop/otel";

export function otelPlugin(): Plugin {
  const tracer = trace.getTracer(INSTRUMENTATION_NAME);

  return {
    name: "otel",
    publish: createPublishHook(tracer),
    subscribe: createSubscribeHook(tracer),
  };
}

function createPublishHook(tracer: Tracer): PluginHook {
  return async (payload, ctx, next) => {
    const span = tracer.startSpan("plopslop.publish", {
      kind: SpanKind.PRODUCER,
      attributes: {
        "messaging.system": "plopslop",
        "messaging.destination": ctx.topic,
        "messaging.message.id": ctx.id,
        "messaging.operation": "publish",
      },
    });

    try {
      injectTraceContext(ctx, span);

      const payloadSize = getPayloadSize(payload);
      if (payloadSize !== null) {
        span.setAttribute("messaging.message.payload_size_bytes", payloadSize);
      }

      await context.with(trace.setSpan(context.active(), span), async () => {
        await next();
      });

      span.setStatus({ code: SpanStatusCode.OK });
    } catch (error) {
      recordException(span, error);
      throw error;
    } finally {
      span.end();
    }
  };
}

function createSubscribeHook(tracer: Tracer): PluginHook {
  return async (payload, ctx, next) => {
    const parentContext = extractTraceContext(ctx);

    const span = tracer.startSpan(
      "plopslop.subscribe",
      {
        kind: SpanKind.CONSUMER,
        attributes: {
          "messaging.system": "plopslop",
          "messaging.destination": ctx.topic,
          "messaging.message.id": ctx.id,
          "messaging.operation": "receive",
        },
      },
      parentContext,
    );

    try {
      const payloadSize = getPayloadSize(payload);
      if (payloadSize !== null) {
        span.setAttribute("messaging.message.payload_size_bytes", payloadSize);
      }

      await context.with(trace.setSpan(context.active(), span), async () => {
        await next();
      });

      span.setStatus({ code: SpanStatusCode.OK });
    } catch (error) {
      recordException(span, error);
      throw error;
    } finally {
      span.end();
    }
  };
}

function injectTraceContext(ctx: Context, span: Span): void {
  const activeContext = trace.setSpan(context.active(), span);

  const carrier: Record<string, unknown> = {};
  propagation.inject(activeContext, carrier);

  for (const [key, value] of Object.entries(carrier)) {
    ctx[key] = value;
  }
}

function extractTraceContext(ctx: Context) {
  return propagation.extract(context.active(), ctx);
}

function recordException(span: Span, error: unknown): void {
  const exception = error instanceof Error ? error : new Error(String(error));

  span.recordException(exception);
  span.setStatus({
    code: SpanStatusCode.ERROR,
    message: exception.message,
  });
}

function getPayloadSize(payload: unknown): number | null {
  try {
    if (typeof payload === "string") {
      return Buffer.byteLength(payload, "utf8");
    }
    if (Buffer.isBuffer(payload)) {
      return payload.length;
    }
    if (payload && typeof payload === "object") {
      return Buffer.byteLength(JSON.stringify(payload), "utf8");
    }
    return null;
  } catch {
    return null;
  }
}
