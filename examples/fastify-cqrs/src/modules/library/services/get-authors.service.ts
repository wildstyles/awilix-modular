import { Deps } from "../library.module.js";

export class GetAuthorsService {
	private readonly instanceId = Math.random().toString(36).substring(7);

	constructor(
		private readonly inventoryService: Deps["inventoryService"],
		private readonly getBooksService: Deps["getBooksService"],
	) {
		console.log(
			`GetAuthorsService created with instanceId: ${this.instanceId}`,
		);
	}

	getInstanceId(): string {
		return this.instanceId;
	}

	getAuthorCount() {
		this.getBooksService.addBook();
		this.inventoryService.addInventory();

		return 3;
	}

	addAuthor() {
		console.log("2: author added", this.instanceId);
	}
}
