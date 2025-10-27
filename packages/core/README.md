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

// Subscribe using async iterator (recommended)
(async () => {
  for await (const { payload } of pubsub.userCreated.stream()) {
    console.log(`User "${payload.name}" was created.`);
  }
})();

// Or subscribe using callback handler
const subscriptionId = await pubsub.userCreated.subscribe((payload, context) => {
  console.log(`User "${payload.name}" was created at ${context.timestamp}`);
});

// Publish a message
await pubsub.userCreated.publish({ name: 'Alice' });

// Unsubscribe when done
await pubsub.userCreated.unsubscribe(subscriptionId);
```

## Drivers

The core package includes an in-memory event emitter driver. For production use cases:

- **[@plopslop/redis](../redis)** - Redis pub/sub driver
- **[@plopslop/postgres](../postgres)** - PostgreSQL LISTEN/NOTIFY driver

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
- `prefix` - Topic name prefix (default: `'ps'`)

**Returns:** Typed object with topic methods for each defined topic.

### Topic Methods

Each topic has the following methods:

#### `stream(options?)`

Returns an async iterator for consuming messages. **Recommended for most use cases.**

**Parameters:**
- `options.signal?: AbortSignal` - For cancellation
- `options.filter?: (payload, context) => boolean` - Filter messages

**Returns:** `AsyncIterableIterator<Message>`

**Example:**
```typescript
for await (const { payload, context } of pubsub.userCreated.stream()) {
  console.log(payload);
}
```

#### `subscribe(handler)`

Subscribe with a callback handler. Use when you need manual subscription management.

**Parameters:**
- `handler: (payload, context) => void` - Message handler function

**Returns:** `Promise<string>` - Subscription ID for unsubscribing

**Example:**
```typescript
const id = await pubsub.userCreated.subscribe((payload, context) => {
  console.log(payload);
});
```

#### `publish(payload)`

Publish a message to the topic.

**Parameters:**
- `payload` - Data matching the topic's Zod schema

**Returns:** `Promise<void>`

**Throws:** `ZodError` if payload doesn't match schema

#### `unsubscribe(subscriptionId)`

Unsubscribe from the topic.

**Parameters:**
- `subscriptionId: string` - ID returned from `subscribe()`

**Returns:** `Promise<void>`

### `eventEmitter()`

Creates an in-memory driver for local pub/sub.
