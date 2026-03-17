import type { Contract, Handler } from "awilix-modular";

import type {
	GetOwnersQuery as Payload,
	GetOwnersResponse as Response,
} from "./get-owners.dto.js";
import type { Deps } from "./owners.module.js";

export const QUERY_KEY = "owners/get-owners";

type GetOwnersQueryContract = typeof GetOwnersQueryHandler.contract;

export class GetOwnersQueryHandler implements Handler<GetOwnersQueryContract> {
	readonly key = QUERY_KEY;
	static contract: Contract<typeof QUERY_KEY, Payload, Response>;

	constructor(private readonly ownersService: Deps["ownersService"]) {}

	async executor(payload: Payload): Promise<Response> {
		return {
			owners: [],
			cities: [],
		};
	}
}
