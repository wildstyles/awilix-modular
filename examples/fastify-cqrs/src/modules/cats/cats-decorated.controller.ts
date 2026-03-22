import { GET } from "awilix-modular";

import {
	GetCatsQuerySchema,
	GetCatsResponseSchema,
	GetCatsResponse,
} from "./get-cats.dto.js";
import { Deps } from "./cats.module.js";

export class CatsDecoratedController {
	private readonly instanceId = Math.random().toString(36).substring(7);

	constructor(private readonly getCatsService: Deps["getCatsService"]) {}

	// TODO: add decorator for schema validation + req/res typings
	@GET("/cats-decorated")
	async getCats(): Promise<GetCatsResponse> {
		const result = await this.getCatsService.executor({} as any);

		return { controllerInstanceId: this.instanceId, result };
	}
}
