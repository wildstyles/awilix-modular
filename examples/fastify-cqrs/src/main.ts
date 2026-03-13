import { DIContext, initializeBus, type Bus } from "awilix-modular";

import { buildApp, type FastifyInstance } from "./app.js";
import {
	AppModule,
	type QueryContracts,
	type CommandContracts,
} from "./modules";

async function bootstrap() {
	const fastify = buildApp();

	const queryBusInstance = initializeBus<QueryContracts>();
	const commandBusInstance = initializeBus<CommandContracts>();

	fastify.decorate("queryBus", queryBusInstance);
	fastify.decorate("commandBus", commandBusInstance);

	const diContext = new DIContext<FastifyInstance>({
		onController: (ControllerClass, scope) => {
			const controller = scope.build(ControllerClass);

			controller.registerRoutes(fastify);
		},
		onHandler: (HandlerClass, scope) => {
			const handler = scope.build(HandlerClass);

			fastify.queryBus.register(handler.key, handler.executor.bind(handler));
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
