import type { FastifyInstance } from "@/app.js";
import type { Controller } from "@/modules/index.js";

import {
	GetAuthorsQuerySchema,
	GetAuthorsResponseSchema,
} from "../dtos/get-authors.dto.js";

export class GetAuthorsController implements Controller {
	registerRoutes(fastify: FastifyInstance) {
		fastify.route({
			method: "GET",
			url: "/authors",
			schema: {
				querystring: GetAuthorsQuerySchema,
				response: {
					200: GetAuthorsResponseSchema,
				},
			},
			handler: async (req, res) => {
				const result = await fastify.queryBus.execute(
					"library/get-authors",
					req.query,
				);

				return res.status(200).send(result);
			},
		});
	}
}
