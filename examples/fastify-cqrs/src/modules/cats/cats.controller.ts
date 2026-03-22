import type { FastifyInstance } from "@/app.js";
import type { Controller } from "@/modules/index.js";

import { GetCatsQuerySchema, GetCatsResponseSchema } from "./get-cats.dto.js";

export class CatsController implements Controller {
	private readonly instanceId = Math.random().toString(36).substring(7);

	registerRoutes(fastify: FastifyInstance) {
		fastify.route({
			method: "GET",
			url: "/cats",
			schema: {
				querystring: GetCatsQuerySchema,
				response: {
					200: GetCatsResponseSchema,
				},
			},
			// fully type safe thanks to TypeBoxTypeProvider
			handler: async (req, res) => {
				const result = await fastify.queryBus.execute(
					"cats/get-cats",
					req.query,
				);

				return res
					.status(200)
					.send({ controllerInstanceId: this.instanceId, result });
			},
		});
	}
}
