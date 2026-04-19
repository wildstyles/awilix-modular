import { DIContext, type InferGlobalQueryPreHandlers } from "awilix-modular";

import { buildApp } from "@/app.js";
import { AppModule } from "@/modules/index.js";
import {
	TenantModule,
	type TenantModuleDef,
} from "@/modules/tenant/tenant.module.js";
import type { FastifyInstance } from "@/types.js";
import type { RequestContext } from "./request-context.middleware.js";
import { setupSwagger } from "./setup-swagger.js";

async function bootstrap() {
	const fastify = buildApp();

	await setupSwagger(fastify);

	DIContext.create(AppModule, {
		framework: fastify,
		rootProviders: {
			app: fastify,
		},
		globalModules: [TenantModule],
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
	interface ExecutionContext extends RequestContext {}

	// TODO: instead of common deps make infering from global modules
	interface CommonDependencies {
		app: FastifyInstance;
	}

	interface GlobalQueryPreHandlers
		extends InferGlobalQueryPreHandlers<TenantModuleDef> {}
}
