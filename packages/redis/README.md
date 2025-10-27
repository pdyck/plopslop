# @plopslop/redis

Redis driver for distributed pub/sub across Node.js instances.

## Installation

```bash
pnpm add @plopslop/redis ioredis
```

## Usage

```typescript
import { createPubSub } from "@plopslop/core";
import { redis } from "@plopslop/redis";
import { z } from "zod";

const pubsub = createPubSub({
  driver: redis({
    host: "localhost",
    port: 6379,
  }),
  topics: {
    userCreated: {
      name: "user.created",
      schema: z.object({ name: z.string() }),
    },
  },
});
```

## Configuration

The `redis()` function accepts all [ioredis configuration options](https://github.com/redis/ioredis):

```typescript
redis({
  host: "localhost",
  port: 6379,
  password: "your-password",
  db: 0,
  retryStrategy: (times) => Math.min(times * 50, 2000),
})
```

## Limitations

- Messages are ephemeral - not persisted if no subscribers are active
- No message acknowledgment or delivery guarantees
- Subscriber connections must be maintained for message delivery

## Requirements

- Redis 2.0+
- ioredis
- Node.js 18+
