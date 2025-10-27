# @plopslop/otel

OpenTelemetry plugin for distributed tracing.

## Installation

```bash
pnpm add @plopslop/otel @opentelemetry/api
```

You"ll also need OpenTelemetry SDK and exporters. See [OpenTelemetry JS docs](https://opentelemetry.io/docs/languages/js/) for setup.

## Usage

```typescript
import { createPubSub } from "@plopslop/core";
import { redis } from "@plopslop/redis";
import { otelPlugin } from "@plopslop/otel";

const pubsub = createPubSub({
  driver: redis(),
  plugins: [otelPlugin()],
  topics: { /* ... */ },
});
```

## What it does

Creates spans for publish and subscribe operations with W3C trace context propagation:

**Publish spans** (`plopslop.publish`):
- `messaging.system`: `plopslop`
- `messaging.destination`: topic name
- `messaging.message.id`: message ID
- `messaging.operation`: `publish`
- `messaging.message.payload_size_bytes`: payload size

**Subscribe spans** (`plopslop.subscribe`):
- Same attributes as publish
- `messaging.operation`: `receive`
- Linked to parent publish span via trace context

## Integration

Works with any OpenTelemetry-compatible backend, like e.g. Sentry.

See [OpenTelemetry Registry](https://opentelemetry.io/ecosystem/registry/) for exporters.
