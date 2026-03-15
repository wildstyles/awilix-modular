import { Deps } from "../library.module.js";

export class GetBooksService {
	constructor(private readonly getAuthorsService: Deps["getAuthorsService"]) {}

	addBook() {
		this.getAuthorsService.addAuthor();
		console.log("book added");
	}
}
