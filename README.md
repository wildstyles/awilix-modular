# awilix-modular

A type-safe, modular dependency injection wrapper for [Awilix](https://github.com/jeffijoe/awilix) that brings NestJS-like module architecture to any Node.js application.

## Features

- **Type-Safe Module System** - Strict TypeScript types with full IntelliSense support
- **HTTP Framework Agnostic** - Works with Express, Fastify, Koa, or any other framework
- **Automatic Dependency Extraction** - Dependencies are automatically injected based on parameter names
- **NestJS-Inspired Architecture** - Familiar module, provider, and controller patterns
- **Modular Design** - Build scalable applications with clear module boundaries
- **Dynamic Modules** - Configure modules with runtime parameters using `forRoot` pattern
- **Flexible Provider Types** - Support for classes, factories, primitives, and custom providers
- **Zero Lock-in** - Built on top of Awilix, use any Awilix features when needed

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
