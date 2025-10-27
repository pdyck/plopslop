# Hono + WebSocket Chat Example

Real-time chat using Hono, WebSockets, and plopslop with Redis.

## What it shows

- Broadcasting WebSocket messages via plopslop
- Hono web framework with WebSocket support
- Redis driver for distributed messaging
- Lightweight alternative to Express

## Prerequisites

- Redis running on `localhost:6379`
- Node.js 18+

## How to run

From the monorepo root:

```bash
pnpm install
cd examples/chat-hono
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
