import type { FastifyInstance } from "@/app.js";
import type { Controller } from "@/modules/index.js";
import type { Deps } from "./cats.module.js";

import { GetCatsQuerySchema, GetCatsResponseSchema } from "./get-cats.dto.js";

export class GetCatsScopedController implements Controller {
	private readonly instanceId = Math.random().toString(36).substring(7);

	constructor(
		private readonly catsService: Deps["catsService"],
		private readonly dogsService: Deps["dogsService"],
		private readonly resolveSelf: () => GetCatsScopedController,
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
			handler: async (req, res) => {
				// Get the request-scoped controller instance
				const controller = this.resolveSelf();

				const result = {
					approach: "request-scoped (proxy)",
					controllerInstanceId: controller.instanceId,
					catsServiceId: controller.catsService.getInstanceId(),
					dogsServiceId: controller.dogsService.getInstanceId(),
					queryBreed: req.query.breed,
					catsService: controller.catsService.getCats(),
				};

				return res.status(200).send(result as any);
			},
		});
	}
}
