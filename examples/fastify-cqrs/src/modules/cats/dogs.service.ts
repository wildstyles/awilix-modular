import type { Deps } from "./cats.module.js";
import { DogsServiceResponse } from "./get-cats.dto.js";

export class DogsService {
	private readonly instanceId = Math.random().toString(36).substring(7);

	constructor(
		private readonly catsService: Deps["catsService"],
		// private readonly ownersService: Deps["ownersService"],
	) {}

	getInstanceId(): string {
		return this.instanceId + " !!!";
	}

	getDogs(): DogsServiceResponse {
		return {
			// ownersServiceId: this.ownersService.getInstanceId(),
			dogsServiceId: this.getInstanceId(),
			catsServiceId: this.catsService.getInstanceId(),
		};
	}
}
