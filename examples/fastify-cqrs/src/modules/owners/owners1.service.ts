import type { Deps } from "./owners.module.js";

export class Owners1Service {
	private readonly instanceId = Math.random().toString(36).substring(7);

	constructor(private readonly catsService: Deps["catsService"]) {}

	getInstanceId(): string {
		return this.instanceId;
	}

	getOwners1() {
		return {
			catsServiceId: this.catsService.getInstanceId(),
			owners1ServiceId: this.getInstanceId(),
		};
	}
}
