import { Deps } from "./cats.module.js";

export class CatsService {
	private readonly instanceId = Math.random().toString(36).substring(7);

	constructor(
		private readonly ownersService: Deps["ownersService"],
		private readonly owners1Service: Deps["owners1Service"],
		private readonly dogsService: Deps["dogsService"],
	) {
		console.log(`CatsService created with instanceId: ${this.instanceId}`);
	}

	getInstanceId(): string {
		return this.instanceId;
	}

	getCatCount() {
		this.dogsService.addDog();
		this.ownersService.addOwner();

		return 3;
	}

	addCat() {
		console.log("2: cat added", this.instanceId);
	}
}
