import type { Contract, Handler } from "awilix-modular";
import type {
	GetBooksQuery as Payload,
	GetBooksResponse as Response,
} from "../dtos/get-books.dto.js";
import libraryData from "../library.data.json" with { type: "json" };
import type { Deps } from "../library.module.js";

export const QUERY_KEY = "library/get-books";

type GetBooksQueryContract = typeof GetBooksQueryHandler.contract;

export class GetBooksQueryHandler implements Handler<GetBooksQueryContract> {
	readonly key = QUERY_KEY;
	static contract: Contract<typeof QUERY_KEY, Payload, Response>;

	constructor(private readonly deps: Deps) {}

	async executor(payload: Payload): Promise<Response> {
		let filteredBooks = libraryData.books;

		// Filter by genre if provided
		if (payload?.genre) {
			filteredBooks = filteredBooks.filter(
				(book) => book.genre === payload.genre,
			);
		}

		// Filter by authorId if provided
		if (payload?.authorId) {
			filteredBooks = filteredBooks.filter(
				(book) => book.authorId === payload.authorId,
			);
		}

		// Map author names to books
		const authorIdToName = libraryData.authors.reduce<Record<string, string>>(
			(acc, author) => ({
				...acc,
				[author.id]: author.name,
			}),
			{},
		);

		const books = filteredBooks.map((book) => ({
			...book,
			authorName: authorIdToName[book.authorId] || "Unknown",
		}));

		// Extract unique genres
		const genres = books.map((book) => book.genre);

		return {
			books,
			genres: Array.from(new Set(genres)).sort(),
		};
	}
}
