# @plopslop/redis

Redis driver for plopslop - enables distributed pub/sub across multiple Node.js instances.

## Installation

```bash
pnpm add @plopslop/redis ioredis
```

## Usage

```typescript
import { createPubSub } from '@plopslop/core';
import { redis } from '@plopslop/redis';
import { z } from 'zod';

const pubsub = createPubSub({
  driver: redis({
    host: 'localhost',
    port: 6379,
  }),
  topics: {
    userCreated: {
      name: 'user.created',
      schema: z.object({ name: z.string() }),
    },
  },
});
```

## Configuration

The `redis()` function accepts all [ioredis configuration options](https://github.com/redis/ioredis/blob/main/API.md#new-redisport-host-options):

```typescript
redis({
  host: 'localhost',
  port: 6379,
  password: 'your-password',
  db: 0,
  retryStrategy: (times) => Math.min(times * 50, 2000),
})
```

## Features

- **Lazy connection** - Connections are established when needed
- **Automatic subscription management** - Subscribes/unsubscribes to Redis channels as needed
- **Multiple subscriptions per topic** - Efficiently handles multiple handlers for the same topic
- **Cluster support** - Works with Redis Cluster via ioredis

## Connection Management

```typescript
const driver = redis();
const pubsub = createPubSub({ driver, topics: { ... } });
```
