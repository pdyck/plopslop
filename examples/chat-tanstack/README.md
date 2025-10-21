# plopslop Chat Example with oRPC and TanStack Start

A simple real-time chat application demonstrating the integration of:
- **plopslop** for pub/sub messaging (in-memory EventEmitter)
- **oRPC** for type-safe API with Server-Sent Events (SSE)
- **TanStack Start** with Vite for full-stack React

## Features

- Real-time messaging using SSE (no polling, no WebSockets)
- Pure pub/sub architecture - no message persistence
- Type-safe client-server communication with oRPC
- Single global chat room
- In-memory EventEmitter driver (messages exist only while server is running)

## Architecture

### Backend
- **plopslop**: Creates a pub/sub instance with a single `chatMessage` topic using the EventEmitter driver
- **oRPC Router**:
  - `sendMessage`: Mutation that publishes messages to the plopslop topic
  - `messages`: Event Iterator (async generator) that subscribes to plopslop and streams messages via SSE

### Frontend
- **TanStack Start**: Full-stack React framework with Vite
- **TanStack Query**: Uses `experimental_streamedOptions` to consume the SSE stream
- **React UI**: Simple chat interface with message input and real-time message display

## Getting Started

### Install Dependencies

```bash
pnpm install
```

### Run Development Server

```bash
pnpm dev
```

The app will be available at [http://localhost:3000](http://localhost:3000)

### Build for Production

```bash
pnpm build
```

### Start Production Server

```bash
pnpm start
```

## How It Works

1. **User sends a message**:
   - Frontend calls `client.sendMessage()` mutation
   - Backend publishes the message to plopslop's `chatMessage` topic

2. **Message is broadcast**:
   - plopslop's EventEmitter driver broadcasts to all subscribers
   - No storage - messages are ephemeral

3. **Clients receive messages**:
   - Frontend uses `experimental_streamedOptions` with the `messages` procedure
   - oRPC's Event Iterator (async generator) yields messages from plopslop subscription
   - Messages are streamed via SSE to all connected clients
   - TanStack Query appends new messages to the array automatically

## Key Files

- [src/server/pubsub.ts](src/server/pubsub.ts) - plopslop pub/sub configuration
- [src/server/router.ts](src/server/router.ts) - oRPC router with SSE streaming
- [src/routes/api/rpc.$.ts](src/routes/api/rpc.$.ts) - TanStack Start API route
- [src/routes/index.tsx](src/routes/index.tsx) - Chat UI component
- [src/lib/client.ts](src/lib/client.ts) - oRPC client configuration

## Notes

- Messages are NOT persisted - they only exist in the pub/sub stream
- When the server restarts, all message history is lost
- No room support - single global chat
- Uses in-memory EventEmitter (for Redis, use `@plopslop/redis` driver instead)
