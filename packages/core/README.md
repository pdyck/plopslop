# @plopslop/core

Core pub/sub library for Node.js with type-safe message handling and plugin support.

## Installation

```bash
pnpm add @plopslop/core
```

## Features

- **Type-safe** message publishing and subscription using Zod schemas
- **Plugin system** for middleware-style message processing
- **Driver abstraction** - use different backends (Redis, Postgres, in-memory)
- **Async iterators** for elegant subscription handling
- **Zero dependencies** except Zod

## Basic Usage

```typescript
import { createPubSub, eventEmitter } from '@plopslop/core';
import { z } from 'zod';

const pubsub = createPubSub({
  driver: eventEmitter(), // In-memory driver
  topics: {
    userCreated: {
      name: 'user.created',
      schema: z.object({
        name: z.string(),
      }),
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

## Drivers

The core package includes an in-memory event emitter driver. For production use cases:

- **[@plopslop/redis](../redis)** - Redis pub/sub driver
- **@plopslop/postgres** (coming soon) - Postgres LISTEN/NOTIFY driver

## Plugins

Create middleware-style plugins to add functionality:

```typescript
const loggingPlugin = {
  name: 'logging',
  publish: async (payload, context, next) => {
    console.log(`Publishing ${context.topic}`);
    await next();
  },
  subscribe: async (payload, context, next) => {
    console.log(`Receiving ${context.topic}`);
    await next();
  },
};

const pubsub = createPubSub({
  driver: eventEmitter(),
  plugins: [loggingPlugin],
  topics: { ... },
});
```

## API

### `createPubSub(options)`

Creates a pub/sub instance with typed topics.

**Options:**
- `driver` - Driver instance (default: `eventEmitter()`)
- `plugins` - Array of plugins (default: `[]`)
- `topics` - Topic definitions with schemas

### `eventEmitter()`

Creates an in-memory driver for local pub/sub.
