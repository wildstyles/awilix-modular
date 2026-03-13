# Awilix Modular Examples

Examples demonstrating how to use `awilix-modular` with Fastify and TypeBox.

## Getting Started

```bash
# Build the main package first (from root directory)
cd ..
npm run build

# Install examples dependencies
cd examples
npm install

# Run in development mode (with hot reload)
npm run dev

# Or run once
npm start
```

## Examples

### 1. Basic Health Check

A minimal example showing:
- Simple service (`HealthService`)
- Controller with routes (`HealthController`)
- Module definition (`HealthModule`)

**Endpoint:** `GET /health`

### 2. Library Module (CQRS Pattern)

A complete example with:
- **Query Handlers**: CQRS query pattern with contracts
- **TypeBox Schemas**: Request/response validation
- **Query Bus**: Centralized query execution
- **Services**: Business logic (`GetAuthorsService`)
- **Controllers**: HTTP routes with schema validation
- **Module Deps**: Type-safe dependency injection

**Endpoints:**
- `GET /books` - List all books (filter by `?genre=` or `?authorId=`)
- `GET /authors` - List all authors with book counts

## Project Structure

```
src/
├── app.ts                         # FastifyInstance with TypeBox
├── app.module.ts                  # Root module (aggregates all modules)
├── main.ts                        # Bootstrap with DIContext + QueryBus
└── modules/
    ├── health/                    # Simple health check module
    │   ├── health.service.ts
    │   ├── health.controller.ts
    │   └── health.module.ts
    └── library/                   # Full CQRS example
        ├── library.module.ts      # Module definition
        ├── library.data.json      # Mock data
        ├── get-books/
        │   ├── get-books.dto.ts        # TypeBox schemas
        │   ├── get-books.handler.ts    # Query handler
        │   └── get-books.controller.ts # HTTP routes
        └── get-authors/
            ├── get-authors.dto.ts
            ├── get-authors.service.ts   # Business logic
            ├── get-authors.handler.ts
            └── get-authors.controller.ts
```

## Key Concepts

- **Modules**: Group related features (`HealthModule`, `LibraryModule`)
- **AppModule**: Root module that aggregates all modules and exports contracts
- **Query Contracts**: Type-safe query definitions with `Contract<Key, Input, Output>`
- **Handlers**: Implement `Handler<Contract>` with `key` and `executor`
- **Query Bus**: Centralized query execution (`fastify.queryBus.execute(key, payload)`)
- **Controllers**: HTTP routes (implement `Controller<FastifyInstance>`)
- **Services**: Reusable business logic
- **DIContext**: Manages DI and registers modules
- **TypeBox**: Runtime schema validation with TypeScript types
