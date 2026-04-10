import type { FastifyInstance } from "@/types.js";
import type { Controller } from "@/modules/index.js";

import { GetCatsSchema } from "./get-cats.dto.js";

export class CatsController implements Controller {
	private readonly instanceId = Math.random().toString(36).substring(7);

	registerRoutes(fastify: FastifyInstance) {
		fastify.route({
			method: "GET",
			url: "/cats/:id",
			schema: GetCatsSchema,
			// fully type safe thanks to TypeBoxTypeProvider
			handler: async (req, res) => {
				const query = req.query;

				const result = await fastify.queryMediator.execute(
					"cats/get-cats",
					{
						...query,
					},
				);

				return res
					.status(200)
					.send({ controllerInstanceId: this.instanceId, result });
			},
		});
	}
}
