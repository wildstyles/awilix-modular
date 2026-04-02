import { GET, schema } from "awilix-modular";
import type { Request, Response } from "@/types.js";

import type { Deps } from "./cats.module.js";
import { GetCatsSchema } from "./get-cats.dto.js";

/**
 * @swagger
 * /cats-decorated:
 *   get:
 *     summary: Get all cats (decorated)
 *     description: Retrieve a list of cats using decorator-based routing
 *     parameters:
 *       - in: query
 *         name: breed
 *         schema:
 *           type: string
 *         required: false
 *         description: Filter cats by breed
 *     responses:
 *       200:
 *         description: Successful response
 */
export class CatsDecoratedController {
	private readonly instanceId = Math.random().toString(36).substring(7);

	constructor(private readonly getCatsService: Deps["getCatsService"]) {}

	@GET("/cats-decorated")
	@schema(GetCatsSchema)
	async getCats(
		req: Request<typeof GetCatsSchema>,
		res: Response<typeof GetCatsSchema>,
	) {
		const result = await this.getCatsService.executor(req.query);

		res.status(200).json({
			controllerInstanceId: this.instanceId,
			result,
		});
	}
}
