# awilix-modular

[![Build Status](https://github.com/wildstyles/awilix-modular/workflows/ci/badge.svg)](https://github.com/wildstyles/awilix-modular/actions)

A type-safe, modular dependency injection wrapper for [Awilix](https://github.com/jeffijoe/awilix) that brings NestJS-like module architecture to any Node.js application.

## Features

- **Type-Safe Module System** - Strict TypeScript types. ModuleDef is a single source of truth
- **HTTP Framework Agnostic** - Works with Express, Fastify, Koa, or any other framework
- **NestJS-Inspired Architecture** - Familiar module, provider, and controller patterns
- **Less Typing Boilerplate** - Define dependencies once in ModuleDef - reuse in all services

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
import { asClass, asValue } from "awilix";
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

// Create DI context with common dependencies
const diContext = new DIContext({
  rootProviders: {
    logger: asClass(Logger).singleton(),
  },
});

// Register the AppModule
diContext.registerModule(AppModule);

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
  constructor(private readonly deps: UserModuleDeps) {
    // All dependencies are type-safe and auto-completed
    this.deps.emailService; // From UserModule providers
    this.deps.orderService; // From OrderModule exports
    this.deps.logger; // From global root providers
  }
}
```

### 4. Use controllers with any framework

Controllers are registered via callbacks, allowing integration with **any HTTP framework** (Express, Fastify, Hono, Koa, etc.).  
This is especially useful for gradually migrating existing applications to a modular architecture without a full rewrite

```typescript
// user.controller.ts
import type { Express, Request, Response } from "express";
import { UserModuleDeps } from "./user.module.ts";

class UserController {
  constructor(private readonly deps: UserModuleDeps) {}

  registerRoutes(app: Express) {
    app.get("/users/:id", async (req: Request, res: Response) => {
      const user = await this.deps.userService.getUser(req.params.id);
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

// app.ts - Works with any framework (Express example)
import express, { type Express } from "express";

const app = express();
const diContext = new DIContext<Express>({
  rootProviders: {
    logger: asClass(Logger).singleton(),
  },
  // Called for each controller once when modules are registered
  onController: (ControllerClass, scope) => {
    const controller = scope.build(ControllerClass); // Resolve with dependencies
    controller.registerRoutes(app); // Pass your framework instance
  },
});

diContext.registerModule(AppModule);
app.listen(3000);
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
    userService: UserService, // Dependencies auto-injected
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

### Class Providers with Options

Customize Awilix behavior by providing options like `lifetime`:

```typescript
import { Lifetime } from "awilix";

type CacheModuleDef = ModuleDef<{
  providers: {
    cacheService: CacheService;
  };
}>;

export const CacheModule = createStaticModule<CacheModuleDef>({
  name: "CacheModule",
  providers: {
    cacheService: {
      useClass: CacheService,
      lifetime: Lifetime.SINGLETON,
    },
  },
});
```

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
    // Secondary instance - only services, no controllers (avoids duplicate registration error)
    AuthModule.forRoot({ jwtSecret: "admin-secret", audience: "admins" }),
  ],
});
```
