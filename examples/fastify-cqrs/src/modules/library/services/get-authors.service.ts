import libraryData from "../library.data.json" with { type: "json" };

export class GetAuthorsService {
	getAuthorBookCount(authorId: string): number {
		return libraryData.books.filter((book) => book.authorId === authorId)
			.length;
	}
}
