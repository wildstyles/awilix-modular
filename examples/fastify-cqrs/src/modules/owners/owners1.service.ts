import type { Deps } from "./owners.module.js";

export class Owners1Service {
	private readonly instanceId = Math.random().toString(36).substring(7);

	getInstanceId(): string {
		return this.instanceId;
	}
}
