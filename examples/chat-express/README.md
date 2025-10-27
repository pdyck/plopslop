# Express + WebSocket Chat Example

Real-time chat using Express, WebSockets, and plopslop with Redis.

## What it shows

- Broadcasting WebSocket messages via plopslop
- Redis driver for distributed messaging
- Async iterator subscription pattern
- Multiple server instances sharing chat state

## Prerequisites

- Redis running on `localhost:6379`
- Node.js 18+

## How to run

From the monorepo root:

```bash
pnpm install
cd examples/chat-express
pnpm dev
```

Open http://localhost:3000 in multiple browser tabs to test multi-client chat.

To test across multiple server instances:
```bash
# Terminal 1
PORT=3000 pnpm dev

# Terminal 2
PORT=3001 pnpm dev
```

Messages sent to one instance will appear in all instances via Redis pub/sub.
