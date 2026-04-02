import type { Express } from "express";
import type { Controller } from "@/modules/index.js";
import type { Request, Response } from "@/types.js";
import type { Deps } from "./cats.module.js";
import { GetCatsSchema } from "./get-cats.dto.js";

/**
 * @swagger
 * /cats:
 *   get:
 *     summary: Get all cats
 *     description: Retrieve a list of cats with optional breed filter
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 controllerInstanceId:
 *                   type: string
 *                 result:
 *                   type: object
 *                   properties:
 *                     handlerId:
 *                       type: string
 *                     catsServiceId:
 *                       type: string
 *                     catsService:
 *                       type: object
 */
export class CatsController implements Controller {
	private readonly instanceId = Math.random().toString(36).substring(7);

	constructor(private readonly getCatsService: Deps["getCatsService"]) {}

	registerRoutes(app: Express) {
		app.get(
			"/cats",
			async (
				req: Request<typeof GetCatsSchema>,
				res: Response<typeof GetCatsSchema>,
			) => {
				const result = await this.getCatsService.executor(req.query);

				// Type-safe: only 200 is allowed, 201 would error!
				return res.status(200).send({
					controllerInstanceId: this.instanceId,
					result,
				});
			},
		);
	}
}
