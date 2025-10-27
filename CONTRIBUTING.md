# Contributing to plopslop

## Development Setup

Clone the repository and install dependencies:

```bash
git clone https://github.com/pdyck/plopslop.git
cd plopslop
pnpm install
```

## Running Tests

Start required services:

```bash
docker-compose up -d
```

Run tests:

```bash
# All tests
pnpm test

# Specific package
cd packages/core
pnpm test
```

Type check:

```bash
pnpm typecheck
```

Lint:

```bash
pnpm lint
```

## Project Structure

```
plopslop/
├── packages/
│   ├── core/          # Core pub/sub library
│   ├── redis/         # Redis driver
│   ├── postgres/      # PostgreSQL driver
│   └── otel/          # OpenTelemetry plugin
├── examples/
│   ├── chat-express/  # Express + WebSocket example
│   ├── chat-hono/     # Hono + WebSocket example
│   └── chat-next-trpc/# Next.js + tRPC example
└── ...
```

## Code Style

This project uses Biome for linting and formatting:

```bash
# Check
pnpm typecheck
pnpm lint

# Fix
pnpm format
```

## Submitting Changes

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Make your changes
4. Add tests for new functionality
5. Run tests and linting (`pnpm test && pnpm lint`)
6. Commit your changes (`git commit -m 'Add feature'`)
7. Push to your branch (`git push origin feature/my-feature`)
8. Open a Pull Request

## Adding a New Driver

1. Create a new package in `packages/`
2. Implement the `Driver` interface from `@plopslop/core`
3. Add tests (unit and integration)
4. Add README with usage and configuration
5. Add to root README packages list

## Creating a Plugin

1. Create a new package in `packages/`
2. Implement the `Plugin` interface from `@plopslop/core`
3. Add tests
4. Add README with usage
5. Add to root README packages list

## Questions?

Open an issue or discussion on GitHub.
