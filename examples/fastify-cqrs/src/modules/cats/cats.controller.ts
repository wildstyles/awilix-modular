import type { Controller } from "awilix-modular";
import { Deps } from "./cats.module.js";

import { GetCatsSchema } from "./get-cats.dto.js";

export class CatsController implements Controller {
	private readonly instanceId = Math.random().toString(36).substring(7);

	constructor(
		private readonly app: Deps["app"],
		private readonly queryMediator: Deps["queryMediator"],
	) {}

	registerRoutes() {
		this.app.route({
			method: "GET",
			url: "/cats/:id",
			schema: GetCatsSchema,
			// fully type safe thanks to TypeBoxTypeProvider
			handler: async (req, res) => {
				const result = await this.queryMediator.execute(
					"cats/get-cats",
					{
						...req.params,
						...req.query,
					},
					req.context, // Extracted by framework-level middleware
				);

				return res
					.status(200)
					.send({ controllerInstanceId: this.instanceId, result });
			},
		});
	}
}
