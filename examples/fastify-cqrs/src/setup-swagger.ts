import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";
import { FastifyInstance } from "./app.js";

export const setupSwagger = async (fastify: FastifyInstance) => {
	await fastify.register(fastifySwagger, {
		openapi: {
			info: {
				title: "Fastify Example API",
				version: "1.0.0",
			},
			servers: [
				{
					url: "http://localhost:3000",
					description: "Development server",
				},
			],
		},
	});

	await fastify.register(fastifySwaggerUi, {
		routePrefix: "/documentation",
	});

	// NOTE: to see all schemas at end of file they got to be manually added
	// in route
	// https://github.com/fastify/help/issues/875
	// fastify.addSchema(this.config.response[200]);
	fastify.log.info(`Swagger documentation is available at /api-docs`);
};
