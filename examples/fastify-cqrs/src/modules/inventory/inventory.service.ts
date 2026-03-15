import type { Deps } from "./inventory.module.js";

// - one directional dep within circular dep modules can be registered as
// default

// - to break provider circular dep within same module forwardRef is used in one of
// them with ForwardRef type - allowCircular param
// -------------

// - to break provider circular dep within circular dep modules forwardRef
// should be used on both sides

export class InventoryService {
	constructor(private readonly getAuthorsService: Deps["getAuthorsService"]) {}

	addInventory() {
		this.getAuthorsService.addAuthor();

		console.log("add inventory");
	}
}
