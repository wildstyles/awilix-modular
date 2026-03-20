import { controller, GET } from "awilix-modular";
import type { FastifyInstance } from "@/app.js";
import type { Controller } from "@/modules/index.js";

import { GetCatsQuerySchema, GetCatsResponseSchema } from "./get-cats.dto.js";

@controller()
export class GetCatsController implements Controller {
	private readonly instanceId = Math.random().toString(36).substring(7);

	@GET("/cats-decorated")
	getCats() {
		// This method is decorated and metadata is stored
		// Actual implementation is in registerRoutes for now
		return { message: "Hi from decorated method", instanceId: this.instanceId };
	}

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
			handler: async (req, res) => {
				const result = await fastify.queryBus.execute(
					"cats/get-cats",
					req.query,
				);

				console.log(this.instanceId, "from controller");

				return res
					.status(200)
					.send({ result, controllerInstanceId: this.instanceId } as any);
			},
		});
	}
}
