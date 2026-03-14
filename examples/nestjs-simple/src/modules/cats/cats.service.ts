import { Injectable, Scope } from "@nestjs/common";

@Injectable({ scope: Scope.TRANSIENT }) // Test REQUEST scope
export class CatsService {
	private readonly instanceId = Math.random().toString(36).substring(7);

	constructor() {
		console.log(`[CatsService] Created instance: ${this.instanceId}`);
	}

	getInstanceId(): string {
		return this.instanceId;
	}

	getAllCats() {
		return [
			{ id: 1, name: "Whiskers", breed: "Siamese" },
			{ id: 2, name: "Fluffy", breed: "Persian" },
			{ id: 3, name: "Shadow", breed: "Maine Coon" },
		];
	}

	getCatById(id: number) {
		const cats = this.getAllCats();
		return cats.find((cat) => cat.id === id);
	}
}
