import { type Controller, httpException } from "awilix-modular";
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
					{
						executionContext: req.context,
						scenario: "public",
						// scenario: "authorized",
						// includePreHandlers: ["logging", "auth", "tenant"],
						excludePreHandlers: ["auth", "tenant", "logging"],
					},
				);

				if (result.ok) {
					// Success case - return data
					return res.status(200).send({
						controllerInstanceId: this.instanceId,
						result: result.value,
					});
				}

				// Error case - map domain errors to HTTP errors
				const error = result.error;

				// Unknown error
				throw httpException.internalServerError(error.message);
			},
		});
	}
}
