import type { FastifyInstance } from "@/app.js";
import type { Controller } from "@/modules/index.js";

import type { Deps } from "./cats.module.js";
import { GetCatsQuerySchema, GetCatsResponseSchema } from "./get-cats.dto.js";

export class CatsScopedController implements Controller {
	private readonly instanceId = Math.random().toString(36).substring(7);

	constructor(
		private getCatsService: Deps["getCatsService"],
		private readonly resolveSelf: () => CatsScopedController,
	) {}

	registerRoutes(fastify: FastifyInstance) {
		fastify.route({
			method: "GET",
			url: "/cats-scoped",
			schema: {
				querystring: GetCatsQuerySchema,
				response: {
					200: GetCatsResponseSchema,
				},
			},
			// fully type safe thanks to TypeBoxTypeProvider
			handler: async (req, res) => {
				// Get the request-scoped controller instance
				const controller = this.resolveSelf();

				const result = await controller.getCatsService.executor(req.query);

				return res
					.status(200)
					.send({ controllerInstanceId: controller.instanceId, result });
			},
		});
	}
}
