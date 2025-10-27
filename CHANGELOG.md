# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - TBD

### Added

- Core pub/sub library with type-safe message handling using Zod
- Redis driver for distributed pub/sub across Node.js instances
- PostgreSQL driver using LISTEN/NOTIFY
- OpenTelemetry plugin for distributed tracing
- Plugin system for middleware-style message processing
- Async iterator and callback-based subscription APIs
- In-memory event emitter driver for testing
- Examples: Express + WebSocket, Hono + WebSocket, Next.js + tRPC
