import { Injectable, forwardRef, Inject } from "@nestjs/common";

import { ForwardRef } from "@/app.module.js";

import { CatsService } from "./cats.service.js";

@Injectable()
export class DogsService {
	private readonly instanceId = Math.random().toString(36).substring(7);

	constructor(
    // NOTE: circular deps between providers within one module require
    // to have Inject with forwardRef at least on one side
		@Inject(forwardRef(() => CatsService))
    // NOTE: to break circular deps on type level wrapper type(ForwardRef) is also required:
    // https://docs.nestjs.com/recipes/swc#common-pitfalls
		private readonly catsService: ForwardRef<CatsService>,
	) {}

	getInstanceId(): string {
		return this.instanceId;
	}

	getAllDogs() {
		return [{ id: 1, name: "Sharik", breed: "bulldog" }];
	}
}
