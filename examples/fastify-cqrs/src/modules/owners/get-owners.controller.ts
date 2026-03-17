import type { FastifyInstance } from "@/app.js";
import type { Controller } from "@/modules/index.js";

import {
	GetOwnersQuerySchema,
	GetOwnersResponseSchema,
} from "./get-owners.dto.js";

export class GetOwnersController implements Controller {
	registerRoutes(fastify: FastifyInstance) {
		fastify.route({
			method: "GET",
			url: "/owners",
			schema: {
				querystring: GetOwnersQuerySchema,
				response: {
					200: GetOwnersResponseSchema,
				},
			},
			handler: async (req, res) => {
				const result = await fastify.queryBus.execute(
					"owners/get-owners",
					req.query,
				);

				return res.status(200).send(result);
			},
		});
	}
}
