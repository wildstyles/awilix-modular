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

### Create modules with their definitions

```typescript
import { createStaticModule, type ModuleDef } from "awilix-modular";

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

// Define UserModule that imports OrderModule
type UserModuleDef = ModuleDef<{
  providers: {
    userService: UserService;
    emailService: EmailService;
  };
  imports: [typeof OrderModule];
}>;

export type UserModuleDeps = UserModuleDef["deps"];

// Create the module
export const UserModule = createStaticModule<UserModuleDef>({
  name: "UserModule",
  imports: [OrderModule],
  providers: {
    userService: UserService,
    emailService: EmailService,
  },
});
```

### Register DiContext with created module

Create a DI context and register your module:

```typescript
import { DIContext } from "awilix-modular";
import { asClass, asValue } from "awilix";
import { UserModule } from "./user.module";

// Define AppModule that imports UserModule
type AppModuleDef = ModuleDef<{
  imports: [typeof UserModule];
}>;

type CommonDeps = {
  logger: Logger;
};

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
// This allows all modules to access logger without explicit imports
declare module "awilix-modular" {
  interface CommonDependencies extends CommonDeps {}
}
```

### Use ModuleDef deps for provider constructor

The `ModuleDef` automatically extracts dependency types for your constructors:

```typescript
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
