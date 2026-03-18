import type { Deps } from "./owners.module.js";

// - one directional dep within circular dep modules can be registered as
// default

// - to break provider circular dep within same module forwardRef is used in one of
// them with ForwardRef type - allowCircular param
// -------------

// - to break provider circular dep within circular dep modules forwardRef
// should be used on both sides

export class OwnersService {
	private readonly instanceId = Math.random().toString(36).substring(7);

	constructor(private readonly catsService: Deps["catsService"]) {}

	getInstanceId(): string {
		return this.instanceId;
	}

	getOwners() {
		return {
			catsServiceId: this.catsService.getInstanceId(),
			ownerServiceId: this.instanceId,
		};
	}
}
