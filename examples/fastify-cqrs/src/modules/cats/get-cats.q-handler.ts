import type { Contract, Handler } from "awilix-modular";

import type {
	GetCatsQuery as Payload,
	GetCatsResponse as Response,
} from "./get-cats.dto.js";
import type { Deps } from "./cats.module.js";

export const QUERY_KEY = "cats/get-cats";

type GetCatsQueryContract = typeof GetCatsQueryHandler.contract;

export class GetCatsQueryHandler implements Handler<GetCatsQueryContract> {
	readonly key = QUERY_KEY;
	static contract: Contract<typeof QUERY_KEY, Payload, Response>;

	constructor(private readonly catsService: Deps["catsService"]) {
		console.log("INIT?");

		// console.log(
		// 	"[GetCatsQueryHandler] Created with catsService:",
		// 	catsService.getCatCount,
		// );
	}

	async executor(payload: Payload): Promise<Response> {
		console.log(payload.breed, "payload");

		return { catCount: this.catsService.getCatCount() };
	}
}
