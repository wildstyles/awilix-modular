import type { FastifyInstance } from "@/app.js";
import type { Controller } from "@/modules/index.js";
import type { Deps } from "./cats.module.js";
import { getController } from "@/request-scoped-controller.helper.js";

import { GetCatsQuerySchema, GetCatsResponseSchema } from "./get-cats.dto.js";

/**
 * REQUEST-SCOPED CONTROLLER EXAMPLE (Proxy Pattern)
 *
 * This controller demonstrates request-scoped behavior (like NestJS @Scope('REQUEST')).
 * Each HTTP request gets:
 * - Fresh controller instance
 * - Fresh service instances (respecting their lifetime: SCOPED, TRANSIENT)
 *
 * Enable in main.ts:
 * createRequestScopedController(fastify, ControllerClass, context);
 *
 * Note: Most apps should use SINGLETON controllers. Request-scoped is rare!
 */
export class GetCatsScopedController implements Controller {
	private readonly instanceId = Math.random().toString(36).substring(7);

	constructor(
		private readonly catsService: Deps["catsService"],
		private readonly dogsService: Deps["dogsService"],
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
				// req.query is fully typed from schema ✅
				const controller = getController<GetCatsScopedController>(req);

				const result = {
					approach: "request-scoped (proxy)",
					controllerInstanceId: controller.instanceId,
					catsServiceId: controller.catsService.getInstanceId(),
					dogsServiceId: controller.dogsService.getInstanceId(),
					queryBreed: req.query.breed, // Fully typed!
					catsService: controller.catsService.getCats(),
				};

				return res.status(200).send(result as any);
			},
		});
	}
}
