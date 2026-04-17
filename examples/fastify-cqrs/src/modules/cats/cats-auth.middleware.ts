import {
	Middleware,
	type MiddlewareContract,
	Result,
	ExecutionContext,
} from "awilix-modular";
import { UnauthorizedError } from "@/errors.js";

type ReturnType = Result<
	{ userId: string; roles: string[] },
	UnauthorizedError
>;

// type Contract = MiddlewareContract<"cats-auth", ReturnType>;

export class CatsAuthMiddleware implements Middleware {
	static readonly key = "cats-auth";
	declare readonly contract: MiddlewareContract<
		typeof CatsAuthMiddleware.key,
		ReturnType
	>;

	async execute(
		payload: unknown,
		context: Record<string, unknown>,
		executionContext: ExecutionContext,
	): Promise<ReturnType> {
		// Read from executionContext (immutable, from HTTP layer)
		const token = executionContext.token;

		console.log("-------------------AUTH--------------------------");

		// Simulate token verification
		if (!token || token === "invalid") {
			// Return error - type checked via unique error code
			// return Result.error(new UnauthorizedError());
		}

		// In real app: verify JWT token
		// const user = await verifyJWT(token);
		const mockUser = {
			userId: "cats-user-456",
			roles: ["cat-admin", "user"],
		};

		// Return success
		return Result.ok(mockUser);
	}
}
