import type { Deps } from "./inventory.module.js";

export class Inventory1Service {
	private readonly instanceId = Math.random().toString(36).substring(7);

	constructor() {
		console.log(`Inventory1Service created with instanceId: ${this.instanceId}`);
	}

	getInstanceId(): string {
		return this.instanceId;
	}

	addInventory() {
		console.log("4: add inventory 1");
	}
}
