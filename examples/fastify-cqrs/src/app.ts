import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import Fastify from "fastify";

import type { FastifyInstance } from "./types.js";
import { setupErrorHandler } from "./error-handler.js";

export function buildApp() {
	const app: FastifyInstance = Fastify({
		logger: true,
	}).withTypeProvider<TypeBoxTypeProvider>();

	// Turns off response validation
	app.setSerializerCompiler(() => {
		return (data) => JSON.stringify(data);
	});

	setupErrorHandler(app);

	return app;
}
