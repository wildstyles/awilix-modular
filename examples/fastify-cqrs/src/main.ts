import { type Bus, DIContext, initializeBus } from "awilix-modular";

import { buildApp, type FastifyInstance } from "@/app.js";
import {
	AppModule,
	type CommandContracts,
	type QueryContracts,
} from "@/modules/index.js";
import { createRequestScopedController } from "@/request-scoped-controller.helper.js";

async function bootstrap() {
	const fastify = buildApp();

	const queryBusInstance = initializeBus<QueryContracts>();
	const commandBusInstance = initializeBus<CommandContracts>();

	fastify.decorate("queryBus", queryBusInstance);
	fastify.decorate("commandBus", commandBusInstance);

	const diContext = new DIContext<FastifyInstance>({
		containerOptions: {
			strict: true,
			injectionMode: "CLASSIC",
		},
		onController: (ControllerClass, context) => {
			// Pattern 1: Singleton controller (RECOMMENDED - most apps use this)
			// Controller and its dependencies created once at startup
			const controller = context.moduleScope.build(ControllerClass);
			controller.registerRoutes(fastify);

			// Pattern 2: Request-scoped controller (RARE - for special cases)
			// Fresh controller + dependencies per request (like NestJS @Scope('REQUEST'))
			// Uncomment to enable:
			// createRequestScopedController(fastify, ControllerClass, context);
		},
		onQueryHandler: (resolveHandler) => {
			const { key } = resolveHandler();

			fastify.queryBus.register(key, (...args) => {
				return resolveHandler().executor(...args);
			});
		},
	});

	diContext.registerModule(AppModule);

	try {
		await fastify.listen({ port: 3000, host: "0.0.0.0" });
		console.log("Server running on http://localhost:3000");
	} catch (err) {
		fastify.log.error(err);
		process.exit(1);
	}
}

bootstrap();

declare module "fastify" {
	interface FastifyInstance {
		queryBus: Bus<QueryContracts>;
		commandBus: Bus<CommandContracts>;
	}
}
