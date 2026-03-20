import { type Bus, DIContext, initializeBus } from "awilix-modular";

import { buildApp } from "@/app.js";
import {
	AppModule,
	type CommandContracts,
	type QueryContracts,
} from "@/modules/index.js";

async function bootstrap() {
	const fastify = buildApp();

	const queryBusInstance = initializeBus<QueryContracts>();
	const commandBusInstance = initializeBus<CommandContracts>();

	fastify.decorate("queryBus", queryBusInstance);
	fastify.decorate("commandBus", commandBusInstance);

	DIContext.create(AppModule, {
		framework: fastify,
		onQueryHandler: (resolveHandler) => {
			const { key } = resolveHandler();

			fastify.queryBus.register(key, (...args) => {
				return resolveHandler().executor(...args);
			});
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
		queryBus: Bus<QueryContracts>;
		commandBus: Bus<CommandContracts>;
	}
}
