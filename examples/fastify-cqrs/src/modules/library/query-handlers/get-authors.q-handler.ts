import type { Contract, Handler } from "awilix-modular";

import type {
	GetAuthorsQuery as Payload,
	GetAuthorsResponse as Response,
} from "../dtos/get-authors.dto.js";
import libraryData from "../library.data.json" with { type: "json" };
import type { Deps } from "../library.module.js";

export const QUERY_KEY = "library/get-authors";

type GetAuthorsQueryContract = typeof GetAuthorsQueryHandler.contract;

export class GetAuthorsQueryHandler
	implements Handler<GetAuthorsQueryContract>
{
	readonly key = QUERY_KEY;
	static contract: Contract<typeof QUERY_KEY, Payload, Response>;

	constructor(private readonly getAuthorsService: Deps["getAuthorsService"]) {
		console.log(
			"[GetAuthorsQueryHandler] Created with getAuthorsService:",
			!!getAuthorsService,
		);
	}

	async executor(payload: Payload): Promise<Response> {
		console.log(payload.genre, "payload");
		const authors = libraryData.authors.map((author) => ({
			...author,
			bookCount: this.getAuthorsService.getAuthorBookCount(author.id),
		}));

		return { authors };
	}
}
