import type { Deps } from "./cats.module.js";
import type {
	GetCatsQuery as Payload,
	GetCatsResult as Response,
} from "./get-cats.dto.js";

export class GetCatsService {
	private readonly instanceId = Math.random().toString(36).substring(7);

	constructor(private readonly catsService: Deps["catsService"]) {}

	async executor(payload: Payload): Promise<Response> {
		return {
			handlerId: this.instanceId,
			catsServiceId: this.catsService.getInstanceId(),
			catsService: this.catsService.getCats(),
		};
	}
}
