import { Injectable, Scope } from "@nestjs/common";

@Injectable({ scope: Scope.REQUEST }) // Test REQUEST scope
export class DogsService {
	private readonly instanceId = Math.random().toString(36).substring(7);

	constructor() {
		console.log(`[DogsService] Created instance: ${this.instanceId}`);
	}

	getInstanceId(): string {
		return this.instanceId;
	}

	getAllDogs() {
		return [{ id: 1, name: "Sharik", breed: "bulldog" }];
	}

	getDogById(id: number) {
		const dogs = this.getAllDogs();

		return dogs.find((dog) => dog.id === id);
	}
}
