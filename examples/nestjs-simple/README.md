# NestJS Simple Example

Minimal NestJS application to demonstrate how dependency injection scopes work.

## Structure

```
src/
├── modules/
│   └── cats/
│       ├── cats.controller.ts  # Controller with instance tracking
│       ├── cats.service.ts     # Service with instance tracking
│       └── cats.module.ts      # NestJS module
├── app.module.ts               # Root module
└── main.ts                     # Bootstrap
```

## Running

```bash
npm install
npm run start:dev  # Development mode with watch
# or
npm start          # Production mode
```

Server will run on `http://localhost:3001`

## Testing Scopes

The `CatsService` is configured with `Scope.REQUEST` in `cats.service.ts`.

### Test it:

```bash
# Make multiple requests and watch the console
curl http://localhost:3000/cats
curl http://localhost:3000/cats
curl http://localhost:3000/cats/1
```

You should see:
- **New CatsService instance** created for each request
- **Different `serviceInstanceId`** in each response
- **New CatsController instance** created for each request (because it depends on REQUEST-scoped service)

## NestJS Scope Behavior

### Scope.DEFAULT (Singleton)
```typescript
@Injectable() // or @Injectable({ scope: Scope.DEFAULT })
```
- One instance created globally
- Shared across all requests
- Most performant

### Scope.REQUEST
```typescript
@Injectable({ scope: Scope.REQUEST })
```
- New instance created per HTTP request
- Isolated per request
- **Bubbles up**: If a DEFAULT controller depends on REQUEST service, controller becomes REQUEST-scoped too

### Scope.TRANSIENT
```typescript
@Injectable({ scope: Scope.TRANSIENT })
```
- New instance created every time it's injected
- Not shared, even within same request
- Most expensive

## Try Different Scopes

Edit `cats.service.ts` and change:

```typescript
// Singleton (default)
@Injectable()

// Request-scoped
@Injectable({ scope: Scope.REQUEST })

// Transient
@Injectable({ scope: Scope.TRANSIENT })
```

Watch how instance IDs change in console and responses!
