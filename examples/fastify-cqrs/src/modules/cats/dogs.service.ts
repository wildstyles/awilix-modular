import { Deps } from "./cats.module.js";

export class DogsService {
	private readonly instanceId = Math.random().toString(36).substring(7);

	constructor(private readonly catsService: Deps["catsService"]) {
		console.log(`DogsService created with instanceId: ${this.instanceId}`);
	}

	getInstanceId(): string {
		return this.instanceId;
	}

	addDog() {
		console.log("1: dog added::", this.instanceId);
		// this.catsService.addCat();
	}
}
