# plopslop

[![CI](https://github.com/pdyck/plopslop/actions/workflows/ci.yml/badge.svg)](https://github.com/pdyck/plopslop/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)

Type-safe pub/sub library for Node.js with Zod schema validation.

## What is plopslop?

Plopslop provides ephemeral pub/sub messaging with:
- Type-safe message handling using Zod schemas
- Pluggable drivers (Redis, PostgreSQL, in-memory)
- Plugin system for middleware-style processing
- Async iterator and callback-based APIs

Designed for distributing real-time messages to WebSockets, SSE, and server instances.

## Quick Start

```bash
pnpm add @plopslop/core @plopslop/redis ioredis zod
```

```typescript
import { createPubSub } from '@plopslop/core';
import { redis } from '@plopslop/redis';
import { z } from 'zod';

const pubsub = createPubSub({
  driver: redis(),
  topics: {
    userCreated: {
      name: 'user.created',
      schema: z.object({ name: z.string() }),
    },
  },
});

// Subscribe
for await (const { payload } of pubsub.userCreated.stream()) {
  console.log(`User ${payload.name} created`);
}

// Publish
await pubsub.userCreated.publish({ name: 'Alice' });
```

See [@plopslop/core](packages/core) for full API documentation.

## Packages

- **[@plopslop/core](packages/core)** - Core library with driver abstraction and plugin system
- **[@plopslop/redis](packages/redis)** - Redis driver for distributed pub/sub
- **[@plopslop/postgres](packages/postgres)** - PostgreSQL driver using LISTEN/NOTIFY
- **[@plopslop/otel](packages/otel)** - OpenTelemetry plugin for distributed tracing

## Examples

- **[chat-express](examples/chat-express)** - Express + WebSocket chat using Redis
- **[chat-hono](examples/chat-hono)** - Hono + WebSocket chat using Redis
- **[chat-next-trpc](examples/chat-next-trpc)** - Next.js + tRPC with SSE subscriptions

## When to use plopslop

Use plopslop when you need:
- Real-time message distribution across server instances
- Type-safe pub/sub with schema validation
- Low-latency ephemeral messaging
- Integration with WebSockets or Server-Sent Events

Don't use plopslop when you need:
- Guaranteed message delivery
- Message persistence and replay
- Complex routing or message queuing
- Dead letter queues or retries

### Plopslop vs. Message Queues vs. Streaming

Plopslop is designed for ephemeral pub/sub, not message queuing or event streaming. Messages are delivered to active subscribers and then discarded. Unlike RabbitMQ or BullMQ, there is no message persistence or acknowledgment. Unlike Kafka or Pulsar, there is no message replay, consumer groups, or offset management.

Use plopslop for broadcasting real-time events. Use message queues (BullMQ, RabbitMQ) for reliable work distribution. Use event streaming platforms (Kafka, Pulsar) for event sourcing and analytics.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

## License

MIT - see [LICENSE](LICENSE)
