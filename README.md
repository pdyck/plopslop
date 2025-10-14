# plopslop

Ephemeral pub/sub library for Node.js with type-safe message handling.

## What is plopslop?

Plopslop is an ephemeral pub/sub library for Node.js that provides:
- **Type-safe** message publishing and subscription using Zod schemas
- **Low-latency** message distribution
- **Pluggable drivers** (Redis, in-memory)
- **Plugin system** for middleware-style message processing

Perfect for distributing real-time messages to WebSockets and SSE.

## Packages

This is a monorepo containing the following packages:

- **[@plopslop/core](packages/core)** - Core pub/sub library with driver abstraction
- **[@plopslop/redis](packages/redis)** - Redis driver for distributed pub/sub

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

// Subscribe using async iterator
(async () => {
  for await (const { payload } of pubsub.userCreated.subscribe()) {
    console.log(`User "${payload.name}" was created.`);
  }
})();

// Publish a message
await pubsub.userCreated.publish({ name: 'Alice' });
```

## When to use plopslop?

Use plopslop when you need:
- Real-time distribution of messages across multiple server instances
- Low-latency message delivery
- Type-safe pub/sub with schema validation
- Simple broadcast pattern

Don't use plopslop when you need:
- Guaranteed message delivery
- Message persistence and replay
- Complex routing logic
