import type { FastifyInstance } from "@/types.js";
import type { Controller } from "@/modules/index.js";

import type { Deps } from "./cats.module.js";
import { GetCatsSchema } from "./get-cats.dto.js";

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
			schema: GetCatsSchema,
			// fully type safe thanks to TypeBoxTypeProvider
			handler: async (req, res) => {
				// Get the request-scoped controller instance
				const controller = this.resolveSelf();

				const result = await controller.getCatsService.executor(req.query);

				res
					.status(200)
					.send({ controllerInstanceId: controller.instanceId, result });
			},
		});
	}
}
