# awilix-modular

[![Build Status](https://github.com/wildstyles/awilix-modular/workflows/ci/badge.svg)](https://github.com/wildstyles/awilix-modular/actions)
[![codecov](https://codecov.io/gh/wildstyles/awilix-modular/branch/main/graph/badge.svg)](https://codecov.io/gh/wildstyles/awilix-modular)

A type-safe, modular DI library for [Awilix](https://github.com/jeffijoe/awilix) that brings NestJS-like module architecture to any Node.js application.

🚀 **includes native ES decorators (TC39 Stage 3) for routing - no `reflect-metadata` or `experimentalDecorators` required!**

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
  - [1. Create modules with their definitions](#1-create-modules-with-their-definitions)
  - [2. Register DiContext with created modules](#2-register-dicontext-with-created-modules)
  - [3. Type-safe dependency injection in services](#3-type-safe-dependency-injection-in-services)
  - [4. Use controllers with any framework](#4-use-controllers-with-any-framework)
- [Providers](#providers)
  - [Class Providers](#class-providers)
  - [Factory Providers](#factory-providers)
  - [Primitive Providers](#primitive-providers)
  - [Class Providers with DI Options](#class-providers-with-di-options)
  - [Configuring Provider Options](#configuring-provider-options)
  - [Scoped Controllers](#scoped-controllers)
- [Native ES Decorator-Based Routing](#native-es-decorator-based-routing)
- [OpenAPI/Swagger Integration](#openapiswagger-integration)
- [Type-Safe Request/Response](#type-safe-requestresponse)
- [Dynamic Modules](#dynamic-modules)
- [CQRS Pattern Support](#cqrs-pattern-support)
- [Circular Dependencies](#circular-dependencies)
- [Why awilix-modular?](#why-awilix-modular)
  - [The Problem](#the-problem)
  - [The Solution](#the-solution)
  - [Philosophy](#philosophy)

## Features

- **Type-Safe Module System** - Complete type safety for each provider in module
- **HTTP Framework Agnostic** - Works with Express, Fastify, Hono, Koa, or any other framework
- **NestJS-Inspired Architecture** - Familiar module/controller/provider patterns
- **Less Import Boilerplate For Typing** - Define module dependencies once - reuse in all providers
- **Lightweight** - Minimal overhead, built on proven Awilix foundation

## Installation

```bash
npm install awilix-modular awilix
```

```bash
yarn add awilix-modular awilix
```

```bash
pnpm add awilix-modular awilix
```

**Peer Dependencies:** Requires `awilix >= 9.0.0`

## Quick Start

This guide demonstrates building a modular application with `OrderModule` and `UserModule`, showing how modules import each other and share dependencies with full type safety.

> [!TIP]
> For more complete examples including CQRS patterns, circular dependencies, and framework integrations, see the [examples folder](./examples).

### 1. Create modules with their definitions

Define modules with typed providers. Use `exportKeys` to specify which providers are available to importing modules:

```typescript
// order.module.ts
import { createStaticModule, type ModuleDef } from "awilix-modular";
import { OrderService } from "./order.service";

// Define OrderModule
type OrderModuleDef = ModuleDef<{
  providers: {
    orderService: OrderService;
  };
  exportKeys: "orderService";
}>;

export const OrderModule = createStaticModule<OrderModuleDef>({
  name: "OrderModule",
  providers: {
    orderService: OrderService,
  },
  exports: {
    orderService: OrderService,
  },
});

// user.module.ts
import { createStaticModule, type ModuleDef } from "awilix-modular";
import { OrderModule } from "../order/order.module";
import { UserService } from "./user.service";
import { EmailService } from "./email.service";

// Define UserModule that imports OrderModule
type UserModuleDef = ModuleDef<{
  providers: {
    userService: UserService;
    emailService: EmailService;
  };
  imports: [typeof OrderModule];
}>;
// Available deps within module
export type UserModuleDeps = UserModuleDef["deps"];

export const UserModule = createStaticModule<UserModuleDef>({
  name: "UserModule",
  imports: [OrderModule],
  providers: {
    userService: UserService,
    emailService: EmailService,
  },
});
```

### 2. Register DiContext with created modules

Create a DI context with common dependencies (like logger).
Use `declare module` to make common dependencies globally available to all modules:

```typescript
// app.module.ts
import { DIContext } from "awilix-modular";
import { UserModule } from "./user.module";

type CommonDeps = {
  logger: Logger;
};

type AppModuleDef = ModuleDef<{
  imports: [typeof UserModule];
}>;

export const AppModule = createStaticModule<AppModuleDef>({
  name: "AppModule",
  imports: [UserModule],
});

// initialize your http framework instance
const app = express();

// Create DI context with root module and common dependencies
DIContext.create(AppModule, {
  framework: app,
  rootProviders: {
    logger: Logger,
  },
});

// run your http framework service as usual
app.listen(3000);

// Extend CommonDependencies interface to make logger available globally
declare module "awilix-modular" {
  interface CommonDependencies extends CommonDeps {}
}
```

### 3. Type-safe dependency injection in services

Use `ModuleDef['deps']` to get automatic type inference for all available dependencies in your service constructors.  
This includes module providers, imported module exports, and common dependencies:

```typescript
// user.service.ts
import { UserModuleDeps } from "./user.module.ts";

class UserService {
  constructor(
    // From UserModule providers
    private readonly emailService: UserModuleDeps["emailService"],
    // From OrderModule providers
    private readonly orderService: UserModuleDeps["orderService"],
    // From global root providers
    private readonly logger: UserModuleDeps["logger"],
  ) {}
}
```

### 4. Use controllers with any framework

Route definition happens within `registerRoutes` controller method.
It allows integration with **any HTTP framework** (Express, Fastify, Hono, Koa, etc.).  
This is especially useful for gradually migrating existing applications to a modular architecture without a full rewrite

```typescript
// user.controller.ts
import type { Express, Request, Response } from "express";
import { Controller } from "awilix-modular";
import { UserModuleDeps } from "./user.module.ts";

class UserController implements Controller {
  constructor(private readonly userService: UserModuleDeps["userService"]) {}
  // app is framework instance passed during DiContext initialization
  registerRoutes(app: Express) {
    // Direct framework API - no abstraction layer
    app.get("/users/:id", async (req: Request, res: Response) => {
      const user = await this.userService.getUser(req.params.id);
      res.json(user);
    });
  }
}

// user.module.ts - Add controller to module
export const UserModule = createStaticModule<UserModuleDef>({
  name: "UserModule",
  imports: [OrderModule],
  providers: {
    userService: UserService,
    emailService: EmailService,
  },
  controllers: [UserController], // Register controller
});
```

## Providers

**Providers are the main building blocks of modules.** They define services, values, and dependencies that can be injected into your application. Each module declares providers that can be used within the module or exported to other modules.

There are four types of providers:

- **Class providers** - Pass a class constructor (most common)
- **Factory providers** - Custom initialization logic with explicit dependencies
- **Primitive providers** - Values like strings, numbers, booleans
- **Class providers with options** - Class with Awilix configuration (lifetime, injector, etc.)

### Class Providers

The simplest and most common way to register providers - just pass the class constructor:

```typescript
type UserModuleDef = ModuleDef<{
  providers: {
    userService: UserService;
    emailService: EmailService;
  };
}>;

export const UserModule = createStaticModule<UserModuleDef>({
  name: "UserModule",
  providers: {
    userService: UserService,
    emailService: EmailService,
  },
});
```

### Factory Providers

Use factory providers when you need custom initialization logic or working with third-party libraries:

```typescript
// email.module.ts
type EmailModuleDef = ModuleDef<{
  providers: {
    apiKey: string;
    emailService: EmailService;
  };
}>;

export const EmailModule = createStaticModule<EmailModuleDef>({
  name: "EmailModule",
  providers: {
    apiKey: "sendgrid_key_123",
    emailService: {
      provide: EmailService,
      // Declare name of dependencies you want to access in useFactory
      inject: ["apiKey"],
      useFactory: (apiKey) => {
        return new EmailService({ apiKey });
      },
    },
  },
});
```

For better type safety, use `createFactoryProvider` which creates a typed helper that provides types for useFactory params:

```typescript
import { createFactoryProvider } from "awilix-modular";

type NotificationModuleDef = ModuleDef<{
  providers: {
    apiKey: string;
    emailService: EmailService;
  };
}>;

// Create typed factory for this module's dependencies
const factory = createFactoryProvider<NotificationModuleDef["deps"]>();

export const NotificationModule = createStaticModule<NotificationModuleDef>({
  name: "NotificationModule",
  providers: {
    apiKey: "sendgrid_api_key_123",

    emailService: factory({
      provide: EmailService,
      inject: ["apiKey"],
      // each injected dep is fully typed
      useFactory: (apiKey) => {
        return new EmailService({ apiKey });
      },
    }),
  },
});
```

### Primitive Providers

Register simple values like strings, numbers, or booleans directly:

```typescript
type ConfigModuleDef = ModuleDef<{
  providers: {
    apiUrl: string;
    port: number;
    isDevelopment: boolean;
  };
}>;

export const ConfigModule = createStaticModule<ConfigModuleDef>({
  name: "ConfigModule",
  providers: {
    apiUrl: "https://api.example.com",
    port: 3000,
    isDevelopment: process.env.NODE_ENV === "development",
  },
});
```

### Class Providers with DI Options

Customize Awilix behavior by providing options like `lifetime`:

```typescript
import { Lifetime } from "awilix";

type OrderModuleDef = ModuleDef<{
  providers: {
    orderService: OrderService;
  };
}>;

export const OrderModule = createStaticModule<OrderModuleDef>({
  name: "OrderModule",
  providers: {
    orderService: {
      useClass: OrderService,
      lifetime: Lifetime.TRANSIENT,
    },
  },
  controllers: [
    {
      useClass: OrderController,
      lifetime: Lifetime.SCOPED,
    },
  ],
  queryHandlers: [
    {
      useClass: CreateOrderHandler,
      lifetime: Lifetime.SCOPED,
    },
  ],
});
```

### Configuring Provider Options

Provider options (like `lifetime`, `injector`, etc.) can be configured at three levels, with more specific levels overriding general ones:

1. **DiContext level** - Default options for all providers across all modules
2. **Module level** (`providerOptions`) - Default options for all providers/controllers/handlers in the module
3. **Provider level** - Options for a specific provider (highest priority)

```typescript
// 1. DiContext level - applies to everything
DIContext.create(AppModule, {
  providerOptions: { lifetime: Lifetime.SINGLETON }, // default for all
});

// 2. Module level - overrides DiContext defaults
export const OrderModule = createStaticModule<OrderModuleDef>({
  name: "OrderModule",
  providerOptions: { lifetime: Lifetime.SCOPED }, // overrides DiContext
  providers: {
    orderService: OrderService, // uses SCOPED from module
    cacheService: {
      useClass: CacheService,
      lifetime: Lifetime.SINGLETON, // overrides module (highest priority)
    },
  },
  controllers: [
    {
      useClass: OrderController,
      lifetime: Lifetime.SINGLETON, // overrides module
    },
  ],
});
```

> [!NOTE]
> **Default Lifetime:** All providers use `Lifetime.SINGLETON` by default, and it's recommended to keep it unless other behavior is needed.

> [!IMPORTANT]
> **Singleton Scope:** `SINGLETON` lifetime is scoped to the module, not application-wide. Each module gets its own singleton instance.

> [!WARNING]
> **Strict Mode:** Awilix strict mode is enabled by default, which prevents lifetime mismatches. A consumer (like a controller) cannot have a shorter lifetime than the providers it depends on. For example, a `SCOPED` controller cannot inject a `TRANSIENT` provider.

### Scoped Controllers

When using `SCOPED` lifetime for controllers with manual route registration, inject `resolveSelf` to get a fresh instance per request:

```typescript
import type { FastifyInstance } from "fastify";

export class UserController {
  private readonly instanceId = Math.random().toString(36).substring(7);

  constructor(
    private readonly userService: UserModuleDeps["userService"],
    private readonly resolveSelf: () => UserController, // Injected automatically
  ) {}

  registerRoutes(app: FastifyInstance) {
    app.get("/users/:id", async (req, res) => {
      // Resolve request-scoped instance
      const controller = this.resolveSelf();

      const user = await controller.userService.getUser(req.params.id);
      res.send({ user, instanceId: controller.instanceId });
    });
  }
}

// Configure scoped lifetime in module
export const UserModule = createStaticModule<UserModuleDef>({
  name: "UserModule",
  providers: { userService: UserService },
  controllers: [
    {
      useClass: UserController,
      lifetime: Lifetime.SCOPED, // Each request gets new instance
    },
  ],
});
```

> [!NOTE]
> For decorator-based controllers, `resolveSelf` is not needed—scoped resolution happens automatically per request.

## Native ES Decorator-Based Routing

Use native ES decorators (Stage 3) to define routes directly in controller methods without `reflect-metadata` or `experimentalDecorators`.
While decorators can introduce "magic" especially in business logic, they work well for infrastructure concerns like routing.

```typescript
import { controller, GET, POST, before, after, schema } from "awilix-modular";
import type { Express } from "express";
import { UserModuleDeps } from "./user.module";
import { authMiddleware, logMiddleware } from "./middlewares";

@controller("/users") // adds a path prefix for each route. May be skipped if prefix is not needed
@before(authMiddleware) // applies to all routes
export class UserController {
  constructor(private readonly userService: UserModuleDeps["userService"]) {}

  @GET("/:id")
  @after(logMiddleware) // applies to this route only
  async getUser(req, res) {
    const user = await this.userService.getUser(req.params.id);

    res.json(user);
  }

  @POST()
  @schema({
    body: {
      type: "object",
      properties: {
        name: { type: "string" },
        email: { type: "string", format: "email" },
      },
      required: ["name", "email"],
    },
    response: {
      201: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          email: { type: "string" },
        },
      },
    },
  })
  async createUser(req, res) {
    const user = await this.userService.createUser(req.body);

    res.status(201).json(user);
  }
}
```

Available decorators: `@controller`, `@GET`, `@POST`, `@PUT`, `@PATCH`, `@DELETE`, `@HEAD`, `@OPTIONS`, `@before`, `@after`, `@schema`

The `@schema` decorator defines JSON Schema validation and OpenAPI documentation for a route. It works with the `beforeRouteRegistered` hook to enable automatic validation and API documentation generation.

## OpenAPI/Swagger Integration

Awilix-modular provides `OpenAPIBuilder` to automatically generate OpenAPI/Swagger documentation from route schemas and set up custom validators. This works seamlessly with JSON Schema libraries like TypeBox.

> [!NOTE]
> **This is particularly useful for Express applications.** Fastify and Hono already provide schema validation and OpenAPI generation out of the box through their ecosystems (`@fastify/swagger`, `@hono/zod-openapi`). For Express and other frameworks without built-in schema support, `OpenAPIBuilder` bridges this gap by providing similar functionality.

### Using OpenAPIBuilder with beforeRouteRegistered Hook

The `beforeRouteRegistered` hook allows you to intercept route registration to:

1. Build OpenAPI/Swagger documentation from schema decorators
2. Set up custom validation middleware based on JSON schemas

```typescript
import { DIContext, OpenAPIBuilder } from "awilix-modular";
import express from "express";
import Ajv from "ajv";
import swaggerUi from "swagger-ui-express";

const app = express();
const openapiBuilder = new OpenAPIBuilder();
const ajv = new Ajv({ coerceTypes: true, removeAdditional: true });

DIContext.create(AppModule, {
  framework: app,
  beforeRouteRegistered: ({ method, path, schema }) => {
    // 1. Register route for OpenAPI documentation
    openapiBuilder.registerRoute(method, path, schema);

    // 2. Create custom validation middleware from JSON schema
    const validate = ajv.compile({
      type: "object",
      properties: {
        ...(schema.body && { body: schema.body }),
        ...(schema.querystring && { query: schema.querystring }),
        ...(schema.params && { params: schema.params }),
        ...(schema.headers && { headers: schema.headers }),
      },
    });

    // Return middleware to be applied to this route
    return [
      (req, res, next) => {
        const valid = validate({
          body: req.body,
          query: req.query,
          params: req.params,
          headers: req.headers,
        });

        if (!valid) {
          return res.status(400).json({
            error: "Validation failed",
            details: validate.errors,
          });
        }
        next();
      },
    ];
  },
});

const openapiSpec = {
  openapi: "3.0.0",
  info: {
    title: "My API",
    description: "API with automatic OpenAPI generation",
  },
  paths: openapiBuilder.buildPaths(),
};

// Setup Swagger UI
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openapiSpec));

// Start server
app.listen(3000, () => {
  console.log("Server: http://localhost:3000");
  console.log("API Docs: http://localhost:3000/api-docs");
});
```

> [!TIP]
> The `beforeRouteRegistered` hook returns an array of middleware functions that will be automatically applied to the route before your handler executes. This is perfect for validation, authentication, or logging middleware.

> [!NOTE]
> See the [express-swagger example](./examples/express-swagger) for a complete implementation including Swagger UI setup and TypeBox integration.

## Type-Safe Request/Response

When using route schemas with TypeBox or JSON Schema, you can create type-safe Request and Response types that automatically infer types from your schemas. This provides full TypeScript autocomplete and type checking for route parameters, query strings, request bodies, and responses.

### Express Type Safety

Create custom Request and Response types that extract TypeScript types from your route schemas:

```typescript
import type {
  Request as ExpressRequest,
  Response as ExpressResponse,
} from "express";
import type { Static, TSchema } from "@sinclair/typebox";
import type { RouteSchema } from "awilix-modular";

export type Request<S extends RouteSchema> = ExpressRequest<
  S["params"] extends TSchema ? Static<S["params"]> : any,
  any,
  S["body"] extends TSchema ? Static<S["body"]> : any,
  S["querystring"] extends TSchema ? Static<S["querystring"]> : any
>;

export type Response<S extends RouteSchema> = Omit<
  ExpressResponse,
  "status" | "json" | "send"
> & {
  status<Code extends keyof S["response"] & number>(
    code: Code,
  ): Omit<ExpressResponse, "json" | "send"> & {
    json(body: ResponseBodyForStatus<S, Code>): ExpressResponse;
    send(body: ResponseBodyForStatus<S, Code>): ExpressResponse;
  };
  json(
    body: 200 extends keyof S["response"] ? ResponseBodyForStatus<S, 200> : any,
  ): ExpressResponse;
};

type ResponseBodyForStatus<
  S extends RouteSchema,
  Code extends keyof S["response"],
> = S["response"][Code] extends TSchema ? Static<S["response"][Code]> : any;
```

### Fastify Type Safety

For Fastify, combine with TypeBox type provider for full type inference:

```typescript
import type { FastifyRequest, FastifyReply } from "fastify";
import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import type { Static, TSchema } from "@sinclair/typebox";
import type { RouteSchema } from "awilix-modular";

export type Request<S extends RouteSchema> = FastifyRequest<{
  Querystring: S["querystring"] extends TSchema
    ? Static<S["querystring"]>
    : unknown;
  Params: S["params"] extends TSchema ? Static<S["params"]> : unknown;
  Body: S["body"] extends TSchema ? Static<S["body"]> : unknown;
}>;

export type Reply<S extends RouteSchema> = FastifyReply<
  RouteGenericInterface,
  RawServerDefault,
  RawRequestDefaultExpression,
  RawReplyDefaultExpression,
  ContextConfigDefault,
  S,
  TypeBoxTypeProvider
>;
```

### Usage in Controllers

Once defined, use these types in your controllers for full type safety:

```typescript
import { GET, schema } from "awilix-modular";
import { Type } from "@sinclair/typebox";
import type { Request, Response } from "./types";

const GetUserSchema = {
  params: Type.Object({
    id: Type.String(),
  }),
  querystring: Type.Object({
    includeOrders: Type.Optional(Type.Boolean()),
  }),
  response: {
    200: Type.Object({
      id: Type.String(),
      name: Type.String(),
      email: Type.String(),
    }),
  },
};

export class UserController {
  @GET("/users/:id")
  @schema(GetUserSchema)
  async getUser(
    req: Request<typeof GetUserSchema>,
    res: Response<typeof GetUserSchema>,
  ) {
    // TypeScript knows req.params.id is a string
    // TypeScript knows req.query.includeOrders is boolean | undefined
    const user = await this.userService.getUser(req.params.id);

    // TypeScript enforces the response shape matches the schema along with status
    res.status(200).json({
      id: user.id,
      name: user.name,
      email: user.email,
    });
  }
}
```

> [!TIP]
> For complete type-safe implementations, see:
>
> - [Express example](./examples/express-swagger/src/types.ts) - Type-safe Request/Response with schema validation
> - [Fastify example](./examples/fastify-cqrs/src/types.ts) - Full TypeBox integration with Fastify type provider

## Dynamic Modules

Dynamic modules accept configuration at runtime using the `forRoot` pattern, allowing you to configure the same module differently in different contexts:

```typescript
import { createDynamicModule, type ModuleDef } from "awilix-modular";

type DatabaseModuleDef = ModuleDef<{
  providers: {
    connectionString: string;
    databaseService: DatabaseService;
  };
  exportKeys: "databaseService";
  // adding "forRootConfig" makes a module dynamic
  forRootConfig: { connectionString: string };
}>;

export const DatabaseModule = createDynamicModule<DatabaseModuleDef>((config) =>
  createStaticModule({
    name: "DatabaseModule",
    providers: {
      connectionString: config.connectionString,
      databaseService: DatabaseService,
    },
    exports: {
      databaseService: DatabaseService,
    },
  }),
);

export const UserModule = createStaticModule<UserModuleDef>({
  name: "UserModule",
  imports: [
    // Usage: Configure the module when importing
    DatabaseModule.forRoot({
      connectionString: "postgresql://localhost:5432/myapp",
    }),
  ],
});
```

**Controllers in dynamic module:** When using the same dynamic module multiple times with different configurations, use the `registerControllers` option to control which instance registers controllers:

```typescript
export const AppModule = createStaticModule<AppModuleDef>({
  name: "AppModule",
  imports: [
    // Primary instance - registers controllers and routes
    AuthModule.forRoot(
      { jwtSecret: "user-secret", audience: "users" },
      { registerControllers: true },
    ),
    // Secondary instance - only services, no controllers (default: false)
    AuthModule.forRoot({ jwtSecret: "admin-secret", audience: "admins" }),
  ],
});
```

## CQRS Pattern Support

Awilix-modular encourages and provides utilities for implementing the CQRS (Command Query Responsibility Segregation) pattern with type-safe query and command handlers.

### Defining Query Handlers

Create handlers that implement the `Handler<Contract>` interface with a unique key and executor function:

```typescript
import { type Contract, type Handler } from "awilix-modular";
import type { UserModuleDeps } from "./user.module";

// Define payload and response types
type Payload = { userId: string };
type Response = { id: string; role: "admin" | "user" };

export const GET_USER_QUERY = "users/get-user";

export class GetUserQueryHandler implements Handler<
  typeof GetUserQueryHandler.contract
> {
  readonly key = GET_USER_QUERY;
  static contract: Contract<typeof GET_USER_QUERY, Payload, Response>;

  constructor(private readonly userService: UserModuleDeps["userService"]) {}

  async executor(payload: Payload): Promise<Response> {
    return this.userService.findById(payload.userId);
  }
}
```

### Registering Handlers in Modules

Add query handlers to the module's `queryHandlers` array and export their contracts:

```typescript
// Export module's query contracts (use union for multiple handlers)
export type UserModuleQueryContracts =
  | typeof GetUserQueryHandler.contract
  | typeof GetUserProfileHandler.contract;

export const UserModule = createStaticModule<UserModuleDef>({
  name: "UserModule",
  providers: {
    userService: UserService,
  },
  queryHandlers: [GetUserQueryHandler, GetUserProfileHandler],
});
```

### Initializing the Query Bus

Set up the query bus during application bootstrap and register handlers using the `onQueryHandler` hook:

```typescript
import { type Bus, DIContext, initializeBus } from "awilix-modular";
import { AppModule, type QueryContracts } from "./modules";
import fastify from "fastify";

const app = fastify();
const queryBus = initializeBus<QueryContracts>();

// Decorate Fastify instance with query bus to access bus through app in controllers
app.decorate("queryBus", queryBus);

DIContext.create(AppModule, {
  framework: app,
  onQueryHandler: (resolveHandler) => {
    const { key } = resolveHandler();
    app.queryBus.register(key, (...args) => resolveHandler().executor(...args));
  },
});

// Type augmentation for TypeScript
declare module "fastify" {
  interface FastifyInstance {
    queryBus: Bus<QueryContracts>;
  }
}
```

### Executing Queries

Execute queries from controllers using the type-safe query bus:

```typescript
import type { FastifyInstance } from "fastify";

class UserController {
  registerRoutes(app: FastifyInstance) {
    app.get("/users/:id", async (req, res) => {
      // full typesafety without depending on implementation
      const user = await app.queryBus.execute("users/get-user", {
        userId: req.params.id,
      });
      res.send(user);
    });
  }
}
```

> [!TIP]
> The same pattern applies to command handlers using `commandHandlers` and `onCommandHandler`. See the [fastify-cqrs example](./examples/fastify-cqrs) for a complete implementation.

## Circular Dependencies

Awilix-modular supports circular dependencies between providers and modules using `allowCircular` and `forwardRef` utilities.

### Within Same Module

When providers within the same module depend on each other, use `allowCircular: true` for one of provider:

```typescript
// dogs.service.ts
export class DogsService {
  constructor(private readonly catsService: Deps["catsService"]) {}
}

// cats.service.ts
export class CatsService {
  constructor(private readonly dogsService: Deps["dogsService"]) {}
}

// module.ts
export const AnimalModule = createStaticModule<AnimalModuleDef>({
  name: "AnimalModule",
  providers: {
    dogsService: DogsService,
    catsService: {
      useClass: CatsService,
      allowCircular: true, // Enables circular dependency resolution
    },
  },
});
```

> [!NOTE]
> ✨ Unlike NestJS, no special decorators or annotations are needed in the providers themselves. In NestJS, you'd need `@Inject(forwardRef(() => DogsService))` in the constructor. With awilix-modular, circular dependencies are handled purely at the module level—services remain clean and framework-agnostic.

### Between Modules

When modules import each other, use `forwardRef` and `ModuleRef` type:

```typescript
// cats.module.ts
import { OwnersModule } from "./owners.module";

export type CatsModuleDef = ModuleDef<{
  providers: {
    catsService: CatsService;
  };
  imports: [typeof OwnersModule]; // typeof as usual
  exportKeys: "catsService";
}>;

export const CatsModule = createStaticModule<CatsModuleDef>({
  name: "CatsModule",
  imports: [OwnersModule],
  providers: { catsService: CatsService },
  exports: { catsService: CatsService },
});

// owners.module.ts
import { forwardRef, type ModuleRef } from "awilix-modular";
import { CatsModule, type CatsModuleDef } from "./cats.module";

export type OwnersModuleDef = ModuleDef<{
  providers: { ownersService: OwnersService };
  imports: [ModuleRef<CatsModuleDef>]; // Use ModuleRef for circular imports
}>;

// Explicit type annotation required for breaking circular type ref
export const OwnersModule: StaticModule<OwnersModuleDef> =
  createStaticModule<OwnersModuleDef>({
    name: "OwnersModule",
    imports: [forwardRef(() => CatsModule)], // Wrap with forwardRef
    providers: { ownersService: OwnersService },
    exports: { ownersService: OwnersService },
  });
```

### Between Providers of Different Cyclic Modules

When providers from circularly dependent modules depend on each other, combine both approaches:

```typescript
// cats.module.ts
export const CatsModule = createStaticModule<CatsModuleDef>({
  name: "CatsModule",
  imports: [OwnersModule],
  providers: {
    catsService: {
      useClass: CatsService,
      allowCircular: true, // Required for cross-module circular dependency
    },
  },
  exports: {
    catsService: {
      useClass: CatsService,
      allowCircular: true, // Also required in exports
    },
  },
});

// owners.module.ts
export const OwnersModule: StaticModule<OwnersModuleDef> =
  createStaticModule<OwnersModuleDef>({
    name: "OwnersModule",
    imports: [forwardRef(() => CatsModule)],
    providers: {
      ownersService: OwnersService, // Uses catsService from CatsModule
    },
  });
```

> [!WARNING]
> While circular dependencies are supported, they may indicate architectural issues. Consider refactoring to extract shared dependencies into a separate module when possible.

## Why awilix-modular?

### The Problem

In NestJS, every service must import its dependencies repeatedly. As your application grows, you end up writing the same type declarations over and over:

```typescript
// user.service.ts
import { Injectable } from "@nestjs/common";
import { Logger } from "./logger.service";
import { ConfigService } from "./config.service";
import { DatabaseService } from "./database.service";
import { EmailService } from "./email.service";
import { OrderService } from "./order.service";

@Injectable()
class UserService {
  constructor(
    private readonly logger: Logger,
    private readonly config: ConfigService,
    private readonly database: DatabaseService,
    private readonly emailService: EmailService,
    private readonly orderService: OrderService,
  ) {}
}

// payment.service.ts
import { Injectable } from "@nestjs/common";
import { Logger } from "./logger.service"; // repeated
import { ConfigService } from "./config.service"; // repeated
import { DatabaseService } from "./database.service"; // repeated
import { OrderService } from "./order.service"; // repeated

@Injectable()
class OrderService {
  constructor(
    private readonly logger: Logger,
    private readonly config: ConfigService,
    private readonly database: DatabaseService,
    private readonly orderService: OrderService,
  ) {}
}
```

> [!NOTE]
> **Every service repeats the same imports and type declarations!**

### The Solution

With awilix-modular, you define your dependencies **once** in `ModuleDef` and reuse the type across all services:

```typescript
// user.module.ts - Define ALL dependencies once during module creation
import { createStaticModule, type ModuleDef } from "awilix-modular";
import { UserService } from "./user.service";
import { PaymentService } from "./payment.service";
import { NotificationService } from "./notification.service";
import { EmailService } from "./email.service";
import { OrderService } from "./order.service";

// Define ALL provider dependencies in ModuleDef
type UserModuleDef = ModuleDef<{
  providers: {
    userService: UserService;
    paymentService: PaymentService;
    notificationService: NotificationService;
    emailService: EmailService;
    orderService: OrderService;
  };
}>;

// Export the type - services will import this
export type UserModuleDeps = UserModuleDef["deps"];

// Ensure UserModule implements UserModuleDef and has everything inside container;
export const UserModule = createStaticModule<UserModuleDef>({
  name: "UserModule",
  providers: {
    userService: UserService,
    paymentService: PaymentService,
    notificationService: NotificationService,
    emailService: EmailService,
    orderService: OrderService,
  },
});

// user.service.ts
// single import. type knows every module dependency
import { UserModuleDeps } from "./user.module";

class UserService {
  constructor(
    private readonly logger: UserModuleDeps["logger"],
    private readonly config: UserModuleDeps["config"],
    private readonly database: UserModuleDeps["database"],
    private readonly orderService: UserModuleDeps["orderService"],
  ) {}
}
```

**Even less boilerplate with Proxy Injection Mode!**

```typescript
// user.service.ts
import { UserModuleDeps } from "./user.module";

class UserService {
  constructor(private readonly deps: UserModuleDeps) {}
}
```

> [!TIP]
> **Define module provider dependencies once during module definition and use it's type**

### Philosophy

**Single Source of Truth**: Your `ModuleDef` is the complete definition of what's available in your module. Change it once, and all services are updated.

**Configuration in Module, Not Provider**: DI options(Injectable decorator) are configured at the module level, keeping provider files clean and focused on business logic.

**Less Boilerplate**: Define dependencies once in your module, not repeatedly in every constructor. No reflection, no repeated type declarations.

**Future-Proof**: Built on native ES Stage 3 decorators and standard JavaScript. no experimental features or polyfills required.
