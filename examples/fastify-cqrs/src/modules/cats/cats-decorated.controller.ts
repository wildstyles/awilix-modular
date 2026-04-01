import { GET, schema } from "awilix-modular";
import { FastifyReply, FastifyRequest } from "fastify";
import type { Deps } from "./cats.module.js";
import {
	GetCatsQuerySchema,
	type GetCatsResponse,
	type GetCatsQuery,
	GetCatsResponseSchema,
} from "./get-cats.dto.js";

export class CatsDecoratedController {
	private readonly instanceId = Math.random().toString(36).substring(7);

	constructor(private readonly getCatsService: Deps["getCatsService"]) {}

	@GET("/cats-decorated")
	@schema({
		querystring: GetCatsQuerySchema,
		response: {
			200: GetCatsResponseSchema,
		},
	})
	async getCats(
		req: FastifyRequest<{ Querystring: GetCatsQuery }>,
	): Promise<GetCatsResponse> {
		const result = await this.getCatsService.executor(req.query);

		return { controllerInstanceId: this.instanceId, result };
	}
}
