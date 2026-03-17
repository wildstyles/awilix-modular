import { Deps } from "../library.module.js";

export class GetBooksService {
	private readonly instanceId = Math.random().toString(36).substring(7);

	constructor(private readonly getAuthorsService: Deps["getAuthorsService"]) {
		console.log(`GetBooksService created with instanceId: ${this.instanceId}`);
	}

	getInstanceId(): string {
		return this.instanceId;
	}

	addBook() {
		console.log("1: book added::", this.instanceId);
		this.getAuthorsService.addAuthor();
	}
}
