import type { Deps } from "./cats.module.js";

export class CatsService {
	private readonly instanceId = Math.random().toString(36).substring(7);

	constructor(
		private readonly ownersService: Deps["ownersService"],
		private readonly owners1Service: Deps["owners1Service"],
		private readonly dogsService: Deps["dogsService"],
	) {}

	getInstanceId(): string {
		return this.instanceId;
	}

	getCats() {
		return {
			catsServiceId: this.instanceId,
			dogsServiceId: this.dogsService.getInstanceId(),
			ownersServiceId: this.ownersService.getInstanceId(),
			ownersService1Id: this.owners1Service.getInstanceId(),
			ownersService: this.ownersService.getOwners(),
			dogsService: this.dogsService.getDogs(),
		};
	}
}
