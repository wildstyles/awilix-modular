import { Injectable, forwardRef, Inject } from "@nestjs/common";

import { ForwardRef } from "@/app.module.js";

import { CatsService } from "../cats/cats.service.js";

@Injectable()
export class OwnersService {
	constructor(
    // NOTE: this is provider from "CatsModule".
    // "forwardRef(() =>)" must be used on BOTH providers
    // "ForwardRef" type is used at least on ONE side
		@Inject(forwardRef(() => CatsService))
		private readonly catsService: ForwardRef<CatsService>,
	) {}

	getAllOwners() {
		return [
			{ id: 1, name: "John Doe", catIds: [1, 2] },
			{ id: 2, name: "Jane Smith", catIds: [3] },
		];
	}
}
