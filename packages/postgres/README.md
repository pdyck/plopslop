# @plopslop/postgres

PostgreSQL driver using LISTEN/NOTIFY for distributed pub/sub.

## Installation

```bash
pnpm add @plopslop/postgres pg
```

## Usage

```typescript
import { createPubSub } from "@plopslop/core";
import { postgres } from "@plopslop/postgres";
import { z } from "zod";

const pubsub = createPubSub({
  driver: postgres({
    host: "localhost",
    port: 5432,
    user: "postgres",
    password: "your-password",
    database: "myapp",
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

The `postgres()` function accepts all [node-postgres configuration options](https://node-postgres.com/apis/client):

```typescript
postgres({
  host: "localhost",
  port: 5432,
  user: "postgres",
  password: "your-password",
  database: "myapp",
  ssl: { rejectUnauthorized: false },
})
```

Connection string format is also supported:

```typescript
postgres("postgresql://user:password@localhost:5432/myapp")
```

## Limitations

- **8KB payload limit** - PostgreSQL NOTIFY has an 8000 byte maximum
- **Same-session delivery** - Messages sent from a session are not received by the same session
- **No persistence** - Messages are lost if no subscribers are listening
- **Lower throughput** - ~1K-5K messages/second vs Redis"s 10K-50K

For large payloads, send references (IDs) instead of full data.

## Requirements

- PostgreSQL 9.0+
- pg
- Node.js 18+
