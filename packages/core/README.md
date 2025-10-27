# @plopslop/core

Core pub/sub library with type-safe message handling and plugin support.

## Installation

```bash
pnpm add @plopslop/core zod
```

## Usage

### Basic pub/sub

```typescript
import { createPubSub } from '@plopslop/core';
import { z } from 'zod';

const pubsub = createPubSub({
  topics: {
    userCreated: {
      name: 'user.created',
      schema: z.object({ name: z.string() }),
    },
  },
});

for await (const { payload } of pubsub.userCreated.stream()) {
  console.log('User created:', payload.name);
}

await pubsub.userCreated.publish({ name: 'Alice' });
```

### Message filtering

```typescript
const pubsub = createPubSub({
  topics: {
    orders: {
      name: 'order.created',
      schema: z.object({
        amount: z.number(),
        priority: z.enum(['low', 'high']),
      }),
    },
  },
});

// Only process high-priority orders
for await (const { payload } of pubsub.orders.stream({
  filter: (payload) => payload.priority === 'high',
})) {
  console.log('High priority order:', payload.amount);
}
```

### Multiple topics

```typescript
const pubsub = createPubSub({
  topics: {
    userCreated: {
      name: 'user.created',
      schema: z.object({ id: z.string() }),
    },
    userDeleted: {
      name: 'user.deleted',
      schema: z.object({ id: z.string() }),
    },
  },
});

await pubsub.userCreated.publish({ id: '123' });
await pubsub.userDeleted.publish({ id: '456' });
```

### Cancellation

```typescript
const controller = new AbortController();

for await (const msg of pubsub.events.stream({
  signal: controller.signal
})) {
  if (shouldStop) {
    controller.abort();
  }
}
```

## Driver Architecture

The driver abstraction allows pluggable backends:

```typescript
interface Driver {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  publish(topic: string, message: string): Promise<void>;
  subscribe(topic: string, handler: (message: string) => void): Promise<string>;
  unsubscribe(subscription: string): Promise<void>;
}
```

Drivers handle transport-specific details (Redis pub/sub, PostgreSQL LISTEN/NOTIFY, in-memory events) while the core provides type safety, schema validation, and plugin execution.

## Plugins

Plugins add middleware-style processing to publish and subscribe operations.

### Plugin Interface

```typescript
interface Plugin {
  name: string;
  publish?: (payload: unknown, context: Context, next: () => Promise<void>) => Promise<void>;
  subscribe?: (payload: unknown, context: Context, next: () => Promise<void>) => Promise<void>;
}
```

### Logging Plugin

```typescript
const loggingPlugin = {
  name: 'logging',
  publish: async (payload, context, next) => {
    console.log(`Publishing to ${context.topic}`);
    await next();
  },
  subscribe: async (payload, context, next) => {
    console.log(`Received from ${context.topic}`);
    await next();
  },
};

const pubsub = createPubSub({
  plugins: [loggingPlugin],
  topics: { /* ... */ },
});
```

### Validation Plugin

```typescript
const validationPlugin = {
  name: 'validation',
  publish: async (payload, context, next) => {
    if (!payload.id) {
      throw new Error('Missing required id field');
    }
    await next();
  },
};
```

## API

### createPubSub(options)

```typescript
function createPubSub<TTopics extends Record<string, TopicDefinition>>(
  options: PubSubOptions<TTopics>
): PubSub<TTopics>
```

Creates a type-safe pub/sub instance.

**Options:**
- `driver?: Driver` - Backend driver (default: `eventEmitter()`)
- `plugins?: Plugin[]` - Middleware plugins (default: `[]`)
- `topics: Record<string, TopicDefinition>` - Topic definitions (required)
- `prefix?: string` - Topic name prefix (default: `"ps"`)

**Returns:** Object with methods for each defined topic

### Topic Methods

Each topic provides:

#### stream(options?)

```typescript
stream(options?: IteratorOptions): AsyncIterableIterator<Message>
```

Subscribe using async iterator. Recommended for most use cases.

**Options:**
- `signal?: AbortSignal` - Cancellation signal
- `filter?: (payload, context) => boolean | Promise<boolean>` - Message filter

```typescript
for await (const { payload, context } of pubsub.events.stream()) {
  console.log(payload);
}
```

#### subscribe(handler)

```typescript
subscribe(handler: (payload, context) => void): Promise<string>
```

Subscribe with callback handler. Returns subscription ID for cleanup.

```typescript
const id = await pubsub.events.subscribe((payload, context) => {
  console.log(payload);
});
```

#### publish(payload)

```typescript
publish(payload: PayloadType): Promise<void>
```

Publish a message. Validates against topic schema.

Throws `ZodError` if payload doesn't match schema.

#### unsubscribe(subscriptionId)

```typescript
unsubscribe(subscriptionId: string): Promise<void>
```

Unsubscribe from topic.

### eventEmitter()

```typescript
function eventEmitter(): Driver
```

Creates an in-memory driver for local pub/sub.

## Requirements

- zod
- Node.js 18+
