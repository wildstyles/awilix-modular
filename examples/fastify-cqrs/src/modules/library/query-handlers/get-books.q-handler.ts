import type { Contract, Handler } from "awilix-modular";

import type {
	GetBooksQuery as Payload,
	GetBooksResponse as Response,
} from "../dtos/get-books.dto.js";
import type { Deps } from "../library.module.js";

export const QUERY_KEY = "library/get-books";

type GetBooksQueryContract = typeof GetBooksQueryHandler.contract;

export class GetBooksQueryHandler implements Handler<GetBooksQueryContract> {
	readonly key = QUERY_KEY;
	static contract: Contract<typeof QUERY_KEY, Payload, Response>;

	constructor(private readonly inventoryService: Deps["inventoryService"]) {}

	async executor(payload: Payload): Promise<Response> {
		return {
			books: [],
			genres: [],
		};
	}
}
