import { Injectable, forwardRef, Inject } from "@nestjs/common";

import { OwnersService } from "../owners/owners.service.js";
import { Owners1Service } from "../owners/owners1.service.js";

import { DogsService } from "./dogs.service.js";

@Injectable() 
export class CatsService {
	private readonly instanceId = Math.random().toString(36).substring(7);

	constructor(
    // NOTE: this is provider from "OwnersModule".
    // "forwardRef(() =>)" must be used on BOTH providers
    // "ForwardRef" type is used at least on ONE side
		@Inject(forwardRef(() => OwnersService))
		private readonly ownersService: OwnersService,
		// NOTE: this is provider from circular dep "OwnersModule".
		// Can be declared with default declaration since it's not circular
		// dependent on "CatsService"(one directional)
		private readonly owners1Service: Owners1Service,
		// NOTE: this is circular provider dep within same module with default declaration.
		// "@Inject(forwardRef)" and type "ForwardRef" declared inside DogsService
		private readonly dogsService: DogsService,
	) {}

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
}
