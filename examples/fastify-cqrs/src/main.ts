import { DIContext, Mediator } from "awilix-modular";

import { buildApp } from "@/app.js";
import { FastifyInstance } from "@/types.js";
import {
	AppModule,
	type CommandContracts,
	type QueryContracts,
} from "@/modules/index.js";
import { setupSwagger } from "./setup-swagger.js";
import { RequestContext } from "./request-context.middleware.js";
import {
	authMiddleware,
	loggingMiddleware,
	tenantMiddleware,
} from "./middlewares.js";

async function bootstrap() {
	const fastify = buildApp();

	await setupSwagger(fastify);

	DIContext.create(AppModule, {
		framework: fastify,
		rootProviders: {
			app: fastify,
		},
		queryMediatorBuilder: Mediator.initializeBuilder()
			.addMiddleware(loggingMiddleware)
			.addMiddleware(authMiddleware)
			.addMiddleware(tenantMiddleware)
			.build(),
		commandMediatorBuilder: Mediator.initializeBuilder()
			.addMiddleware(loggingMiddleware)
			.addMiddleware(authMiddleware)
			.addMiddleware(tenantMiddleware)
			.build(),
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

declare module "awilix-modular" {
	interface QueryRegistry extends QueryContracts {}
	interface CommandRegistry extends CommandContracts {}

	interface ExecutionContext extends RequestContext {}

	interface CommonDependencies {
		app: FastifyInstance;
	}

	// TODO: separate query from command
	interface MiddlewareTagRegistry {
		auth: { userId: string; roles: string[] };

		logging: { requestId: string; timestamp: number };

		tenant: { tenantId: string; tenantName: string };
	}
}
