import {
	Middleware,
	type MiddlewareContract,
	Result,
	ExecutionContext,
} from "awilix-modular";
import { LoggerError } from "@/errors.js";

type ReturnType = Result<{ loggerId: string }, LoggerError>;

export class CatsLoggingMiddleware implements Middleware {
	static readonly key = "cats-tenant";
	declare readonly contract: MiddlewareContract<
		typeof CatsLoggingMiddleware.key,
		ReturnType
	>;

	async execute(
		payload: unknown,
		context: Record<string, unknown>,
		executionContext: ExecutionContext,
	): Promise<ReturnType> {
		// Read from executionContext (immutable, from HTTP layer)
		const token = executionContext.token;

		if (!token || token === "invalid") {
			return Result.error(new LoggerError());
		}

		// Return success
		return Result.ok({ loggerId: "LoggerId" });
	}
}
