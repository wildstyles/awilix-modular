import type { FastifyInstance } from "@/app.js";
import type { Controller } from "@/modules/index.js";

import { GetCatsQuerySchema, GetCatsResponseSchema } from "./get-cats.dto.js";

export class GetCatsController implements Controller {
	private readonly instanceId = Math.random().toString(36).substring(7);

	registerRoutes(fastify: FastifyInstance) {
		const that = this;
		fastify.route({
			method: "GET",
			url: "/cats",
			schema: {
				querystring: GetCatsQuerySchema,
				response: {
					200: GetCatsResponseSchema,
				},
			},
			handler: async function (req, res) {
				const result = await fastify.queryBus.execute(
					"cats/get-cats",
					req.query,
				);

				console.log(that.instanceId, "from controller");

				return res
					.status(200)
					.send({ result, controllerInstanceId: that.instanceId } as any);
			},
		});
	}
}
