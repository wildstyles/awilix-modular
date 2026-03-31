---
marp: true
theme: default
paginate: true
style: |
  section {
    font-size: 28px;
    background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
    color: #e2e8f0;
  }
  pre {
    font-size: 18px;
  }
  h1 {
    color: #38bdf8;
  }
  h2 {
    color: #60a5fa;
  }
  a {
    color: #38bdf8;
  }
  strong {
    color: #fbbf24;
  }
  .columns {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1rem;
  }
---

# **awilix-modular** 🚀

### Type-safe, modular Dedendency Injection for Node.js

_How creating a sportsman POC turned into my first open-source project: a lightweight alternative to NestJS_ ⚡

---

## Introduction 👋

Like every JS developer, my first Node.js apps were with **Express**.

Express is **unopinionated** in terms of architecture:

- All architectural decisions are on developers
- Gives you full freedom
- But no conventions means every app is different without strict rules - pain
  point of Node.js

That's why **NestJS appeared**:

- Brings **mature enterprise patterns** from Java/C# world (Spring, .NET)
- Strong opinion and structure with **DI and modular system**
- TypeScript out-the-box

---

## What Bothers Me About NestJS 🤨

**1. Experimental decorators dependency:**

- `experimentalDecorators: true`, and `reflect-metadata` required
- Core ecosystem packages (`class-validator`) mandate it

**2. Heavy abstraction layer(that's what framework is about):**

- Adds its own **mandatory** abstraction on top of Express/Fastify
- **It's all or nothing** Requires significant migration effort for existing projects, painful for real business to rewrite from scratch

**3. Ecosystem lock-in:**

- Each tool needs a bridge package: caching, ORM, event-emitter, queues...
- Framework provides everything out of the box, but at a price of more
  dependencies

---

## Looking for Alternatives 🔍

Then I found **Fastify** - a modern **HTTP library** (like Express), not a full framework (like NestJS):

✅ **req/res type safety** with native validation and **easy Swagger integration**
✅ **No additional abstraction** - HTTP library from a Node.js core team contributor
✅ **NestJS uses it underneath** anyway

This made me think: 🤔

> "Do I really need all of NestJS, or can I get the benefits without the drawbacks?"

**The missing piece:** 🧩

I couldn't find a good modular DI system like NestJS for Fastify.
**That's what I needed to build.**

---

## The Challenge 💪

### I challenged myself:

> **"Can I create my own DI modular system without NestJS flaws?"**

---

## Why Awilix?

Of course, I **won't create my own DI container** - I'll use an existing, proven solution.

After research, I chose **Awilix**:

✅ **Most mature** DI library for Node.js
✅ **No decorators** - pure JavaScript/TypeScript
✅ **Trusted author** - clean GitHub, active maintenance, minimal issues
✅ **Fastify ecosystem** - actively used in Fastify projects
✅ **Battle-tested** - proven in production environments

---

## Introducing awilix-modular ✨

Key principles I tried to follow:

- Max type safety
- NestJS-inspired modules with better DX
- Framework-agnostic, minimal abstraction (Express, Fastify, Hono, Koa...)
- Easy integration to existing project
- Native ES decorators (Stage 3 standard)

---

## Basic Example: Define Module

```typescript
import { createStaticModule, type ModuleDef } from "awilix-modular";

type UserModuleDef = ModuleDef<{
  providers: {
    userService: UserService;
    emailService: EmailService;
  };
  imports: [typeof OrderModule];
}>;

// Export deps type - single source of truth
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

---

## Basic Example: Use in Service

```typescript
import { UserModuleDeps } from "./user.module";

class UserService {
  constructor(
    // From UserModule
    private readonly emailService: UserModuleDeps["emailService"],
    // From OrderModule (imported)
    private readonly orderService: UserModuleDeps["orderService"],
    // From global providers
    private readonly logger: UserModuleDeps["logger"],
  ) {}
}
```

**Define once in ModuleDef, use everywhere. Full autocomplete!**

---

## Key Feature 1: Service deps with minimum boilderplate imports 🔒

### NestJS approach:

```typescript
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
    // ... repeat imports in every file
  ) {}
}
```

---

## Key Feature 1: Type Safety

### awilix-modular approach:

```typescript
import { UserModuleDeps } from "./user.module"; // ONE import

class UserService {
  constructor(
    private readonly logger: UserModuleDeps["logger"],
    private readonly config: UserModuleDeps["config"],
    private readonly database: UserModuleDeps["database"],
    // All types from single source of truth
  ) {}
}
```

---

## Key Feature 2: Framework Agnostic 🔌

Works with **any** HTTP framework:

```typescript
class UserController implements Controller {
  constructor(private readonly userService: UserModuleDeps["userService"]) {}

  registerRoutes(app: Express | FastifyInstance | Hono) {
    // Use framework's native API directly
    app.get("/users/:id", async (req, res) => {
      const user = await this.userService.getUser(req.params.id);
      res.json(user);
    });
  }
}
```

**No abstraction layer. Direct framework access.**

---

## The Killer Feature: Gradual Integration 🎯

### **NestJS**: All-or-nothing ⛔

You must rewrite your entire app to use NestJS modules.

### **awilix-modular**: Gradual migration ✅

You can add modular DI to **existing Express/Fastify apps** without rewriting:

```typescript
const app = express();

// Your existing routes still work
app.get("/old-route", handler);

// Add new modular features gradually
DIContext.create(NewModule, { framework: app });

// Both coexist perfectly!
```

---

## Key Feature 3: Native ES Decorators 🎨

```typescript
import { controller, GET, POST, before } from "awilix-modular";

@controller("/users")
@before(authMiddleware)
export class UserController {
  constructor(private readonly userService: UserModuleDeps["userService"]) {}

  @GET("/:id")
  async getUser(req, res) {
    const user = await this.userService.getUser(req.params.id);
    res.json(user);
  }

  @POST()
  async createUser(req, res) {
    const user = await this.userService.createUser(req.body);
    res.status(201).json(user);
  }
}
```

**Native Stage 3 decorators - no `experimentalDecorators` needed!**

---

## NestJS vs awilix-modular ⚖️

<div class="columns">

<div>

### NestJS

❌ Experimental decorators
❌ `reflect-metadata` required
❌ Ecosystem lock-in
❌ Framework-specific(only express, fastify)
❌ Heavy abstraction layer
❌ Repeated type imports
❌ Hard to read and understand
✅ Powerful module system
✅ Great DI

</div>

<div>

### awilix-modular

✅ Native ES decorators
✅ No polyfills needed
✅ Use any library directly
✅ Works with any framework(only express, fastify with decorators)
✅ Zero abstraction
✅ Define types once
✅ **~1000 lines** of readable code
✅ Powerful module system
✅ Great DI

</div>

</div>

---

## Additional Features 🎁

- **CQRS pattern** with type-safe command/query bus
- **Dynamic modules** with `.forRoot()` pattern
- **Circular dependencies** support (cleaner than NestJS)
- **100% test coverage**
- **type tests** - interesting finding

---

## Roadmap 🗺️

**What's next:**

1. **Schema decorators** - validation + Swagger generation for endpoints
2. **Better IDE navigation** - solve "go to definition" jumping to `ModuleDeps["service"]` instead of actual class
3. **HTTP error handling** - specific error classes with status codes

---

## Thank You! 🙏

### Questions? 💬

GitHub: **wildstyles/awilix-modular**
npm: **awilix-modular**
