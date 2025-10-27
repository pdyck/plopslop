# Next.js + tRPC Chat Example

Real-time chat using Next.js, tRPC, and plopslop with Redis via SSE.

## What it shows

- tRPC subscriptions using plopslop async iterators
- Server-Sent Events for real-time updates
- Redis driver for distributed messaging
- End-to-end type safety with tRPC

## Prerequisites

- Redis running on `localhost:6379`
- Node.js 18+

## How to run

From the monorepo root:

```bash
pnpm install
cd examples/chat-next-trpc
pnpm dev
```

Open http://localhost:3000 in multiple browser tabs to test multi-client chat.
