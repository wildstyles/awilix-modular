import { DIContext, Bus } from "awilix-modular";

import { buildApp } from "@/app.js";
import {
	AppModule,
	type CommandContracts,
	type QueryContracts,
} from "@/modules/index.js";
import { setupSwagger } from "./setup-swagger.js";
import {
	authMiddleware,
	loggingMiddleware,
	tenantMiddleware,
} from "./middlewares.js";

const queryBusInstance = Bus.initializeBuilder()
	.addMiddleware(loggingMiddleware)
	.addMiddleware(authMiddleware)
	.addMiddleware(tenantMiddleware)
	.build<QueryContracts>();

// Create command bus
const commandBusInstance = Bus.initialize<CommandContracts>();

async function bootstrap() {
	const fastify = buildApp();

	await setupSwagger(fastify);

	fastify.decorate("queryBus", queryBusInstance);
	fastify.decorate("commandBus", commandBusInstance);

	DIContext.create(AppModule, {
		framework: fastify,
		onQueryHandler: (resolveHandler) => {
			const handler = resolveHandler();

			queryBusInstance.register(
				handler.key,
				(payload, meta) => {
					return resolveHandler().executor(payload, meta);
				},
				{
					middlewareTags: handler.middlewareTags,
					excludeMiddlewareTags: handler.excludeMiddlewareTags,
				},
			);
		},
	});

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
		queryBus: typeof queryBusInstance;
		commandBus: typeof commandBusInstance;
	}
}

declare module "awilix-modular" {
	interface MiddlewareTagRegistry {
		auth: { userId: string; roles: string[] };

		logging: { requestId: string; timestamp: number };

		tenant: { tenantId: string; tenantName: string };
	}
}
