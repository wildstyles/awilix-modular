import type { FastifyInstance } from "../../../app.ts";
import type { Controller } from "../../index.js";

import {
	GetBooksQuerySchema,
	GetBooksResponseSchema,
} from "../dtos/get-books.dto.js";

export class GetBooksController implements Controller {
	registerRoutes(fastify: FastifyInstance) {
		fastify.route({
			method: "GET",
			url: "/books",
			schema: {
				querystring: GetBooksQuerySchema,
				response: {
					200: GetBooksResponseSchema,
				},
			},
			handler: async (req, res) => {
				const result = await fastify.queryBus.execute(
					"library/get-books",
					req.query,
				);

				return res.status(200).send(result);
			},
		});
	}
}
