import type { Deps } from "./cats.module.js";

export class DogsService {
	private readonly instanceId = Math.random().toString(36).substring(7);

	constructor(private readonly catsService: Deps["catsService"]) {}

	getInstanceId(): string {
		return this.instanceId;
	}

	getDogs() {
		return {
			dogsServiceId: this.instanceId,
			catsServiceId: this.catsService.getInstanceId(),
		};
	}
}
