import { Deps } from "../library.module.js";

export class GetAuthorsService {
	constructor(
		private readonly inventoryService: Deps["inventoryService"],
		private readonly getBooksService: Deps["getBooksService"],
	) {
		console.log(this.inventoryService, "int");
		console.log("AUTHOR initialized");
	}

	getAuthorCount() {
		this.getBooksService.addBook();
		// this.inventoryService.addInventory();

		return 3;
	}

	addAuthor() {
		console.log("author added");
	}
}
