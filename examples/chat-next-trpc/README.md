# Next.js + tRPC Chat Example

A simple real-time chat application demonstrating plopslop with Next.js and tRPC subscriptions via Server-Sent Events (SSE).

## Features

- Type-safe tRPC mutations and subscriptions
- Real-time message updates via SSE (no WebSockets needed)
- Plopslop with Redis for distributed pub/sub
- Simple, clean UI

## Prerequisites

- Redis server running on `localhost:6379`

## Getting Started

1. **Install dependencies** (from the monorepo root):
   ```bash
   pnpm install
   ```

2. **Start Redis** (if not already running):
   ```bash
   redis-server
   ```

3. **Run the development server**:
   ```bash
   cd examples/chat-next-trpc
   pnpm dev
   ```

4. **Open your browser**:
   Navigate to [http://localhost:3000](http://localhost:3000)

5. **Test the chat**:
   Open multiple browser tabs to see messages broadcast across all connected clients.

## Project Structure

```
src/
├── server/
│   ├── index.ts           # App router
│   ├── trpc.ts            # tRPC initialization with SSE config
│   ├── pubsub.ts          # Plopslop setup with Redis
│   └── routers/
│       └── chat.ts        # Chat mutations and subscriptions
├── pages/
│   ├── _app.tsx           # Next.js app with tRPC provider
│   ├── index.tsx          # Chat UI
│   └── api/
│       └── trpc/
│           └── [trpc].ts  # tRPC API handler
└── utils/
    └── trpc.ts            # tRPC client with httpSubscriptionLink
```

## How It Works

1. **Server**: tRPC subscriptions use async generators powered by plopslop's async iterator pattern
2. **Client**: Uses `httpSubscriptionLink` via `splitLink` to route subscriptions through SSE
3. **Pub/Sub**: Plopslop handles distributed messaging via Redis
4. **Type Safety**: Full end-to-end type safety from server to client

## Key Technologies

- [Next.js](https://nextjs.org/) - React framework
- [tRPC](https://trpc.io/) - End-to-end typesafe APIs
- [plopslop](../../README.md) - Ephemeral pub/sub library
- [Redis](https://redis.io/) - In-memory data store for pub/sub
