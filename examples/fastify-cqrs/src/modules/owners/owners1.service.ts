import type { Deps } from "./owners.module.js";

export class Owners1Service {
	private readonly instanceId = Math.random().toString(36).substring(7);

	constructor() {
		console.log(`Owners1Service created with instanceId: ${this.instanceId}`);
	}

	getInstanceId(): string {
		return this.instanceId;
	}

	addOwner() {
		console.log("4: add owner 1");
	}
}
