import libraryData from "../library.data.json" with { type: "json" };

export class GetAuthorsService {
	constructor() {
		console.log("[GetAuthorsService] Created (no dependencies)");
	}

	getAuthorBookCount(authorId: string): number {
		return libraryData.books.filter((book) => book.authorId === authorId)
			.length;
	}
}
