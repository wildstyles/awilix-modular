import type { Contract, Handler } from "awilix-modular";
import type { Deps } from "./cats.module.js";
import type {
	GetCatsQuery as Payload,
	GetCatsResponse as Response,
} from "./get-cats.dto.js";

export const QUERY_KEY = "cats/get-cats";

type GetCatsQueryContract = typeof GetCatsQueryHandler.contract;

export class GetCatsQueryHandler implements Handler<GetCatsQueryContract> {
	readonly key = QUERY_KEY;
	static contract: Contract<typeof QUERY_KEY, Payload, Response>;
	private readonly instanceId = Math.random().toString(36).substring(7);

	constructor(
		private readonly catsService: Deps["catsService"],
		private readonly dogsService: Deps["dogsService"],
	) {}

	async executor(payload: Payload): Promise<Response> {
		return {
			handlerId: this.instanceId,
			dogsServiceId: this.dogsService.getInstanceId(),
			catsServiceId: this.catsService.getInstanceId(),
			catsService: this.catsService.getCats(),
		} as any;
	}
}
