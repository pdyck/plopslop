# @plopslop/postgres

PostgreSQL driver for plopslop - enables distributed pub/sub across multiple Node.js instances using PostgreSQL's LISTEN/NOTIFY.

## Installation

```bash
pnpm add @plopslop/postgres pg
```

## Usage

```typescript
import { createPubSub } from '@plopslop/core';
import { postgres } from '@plopslop/postgres';
import { z } from 'zod';

const pubsub = createPubSub({
  driver: postgres({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'your-password',
    database: 'myapp',
  }),
  topics: {
    userCreated: {
      name: 'user.created',
      schema: z.object({ name: z.string() }),
    },
  },
});
```
