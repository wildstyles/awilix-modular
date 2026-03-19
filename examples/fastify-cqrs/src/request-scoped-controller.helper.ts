import type { AwilixContainer } from "awilix";
import type { FastifyInstance, FastifyRequest } from "./app.js";
import type { Controller } from "./modules/index.js";

/**
 * Get the typed controller instance from the request
 *
 * Usage:
 * ```ts
 * handler: async (req, res) => {
 *   const controller = getController<MyController>(req);
 *   controller.someService.doSomething();
 * }
 * ```
 */
export function getController<T>(req: FastifyRequest): T {
	return (req as any).controller as T;
}

/**
 * Create request-scoped controller using Proxy pattern
 *
 * This intercepts fastify.route() calls and wraps handlers to:
 * 1. Create a request scope per request
 * 2. Resolve controller with fresh dependencies
 * 3. Store controller on req for access via getController()
 *
 * Usage in main.ts:
 * ```ts
 * onController: (ControllerClass, context) => {
 *   createRequestScopedController(fastify, ControllerClass, context);
 * }
 * ```
 *
 * Controller code stays unchanged - just use getController() in handlers.
 */
export function createRequestScopedController<T extends Controller>(
	fastify: FastifyInstance,
	ControllerClass: new (...args: any[]) => T,
	context: {
		moduleScope: AwilixContainer;
		createRequestScope: () => AwilixContainer;
		resolveController: (scope: AwilixContainer) => T;
	},
) {
	// Create a proxy that intercepts route registration
	const proxy = new Proxy(fastify, {
		get(target, prop) {
			if (prop === "route") {
				return (config: any) => {
					const originalHandler = config.handler;

					// Wrap handler to inject request-scoped controller
					config.handler = async function (req: any, res: any): Promise<any> {
						// Create a new request scope
						const requestScope = context.createRequestScope();

						// Resolve controller with fresh dependencies
						const controller = context.resolveController(requestScope);

						// Store controller on request for handler access
						req.controller = controller;

						// Call original handler
						return originalHandler(req, res);
					};

					return target.route(config);
				};
			}
			return (target as any)[prop];
		},
	});

	// Use singleton controller instance for route registration
	const tempController = context.moduleScope.build(ControllerClass);
	tempController.registerRoutes(proxy as any);
}
