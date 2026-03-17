import type { Deps } from "./inventory.module.js";

// - one directional dep within circular dep modules can be registered as
// default

// - to break provider circular dep within same module forwardRef is used in one of
// them with ForwardRef type - allowCircular param
// -------------

// - to break provider circular dep within circular dep modules forwardRef
// should be used on both sides

export class InventoryService {
	private readonly instanceId = Math.random().toString(36).substring(7);

	constructor(
		private readonly getAuthorsService: Deps["getAuthorsService"],
		private readonly inventory1Service: Deps["inventory1Service"],
		private readonly getBooksService: Deps["getBooksService"],
	) {
		console.log(`InventoryService created with instanceId: ${this.instanceId}`);
	}

	getInstanceId(): string {
		return this.instanceId;
	}

	addInventory() {
		console.log("3: add inventory");
		this.inventory1Service.addInventory();
		this.getAuthorsService.addAuthor();
		this.getBooksService.addBook();
	}
}
