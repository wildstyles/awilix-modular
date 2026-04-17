import {
	type Middleware,
	type MiddlewareContract,
	Result,
	type ExecutionContext,
} from "awilix-modular";
import { TenantNotFoundError } from "@/errors.js";

type ReturnType = Result<
	{ tenantId: string; tenantName: string },
	TenantNotFoundError
>;

export class TenantMiddleware implements Middleware {
	static readonly key = "tenant";
	declare readonly contract: MiddlewareContract<
		typeof TenantMiddleware.key,
		ReturnType
	>;

	async execute(
		payload: unknown,
		context: Record<string, unknown>,
		executionContext: ExecutionContext,
	): Promise<ReturnType> {
		// Simulate tenant lookup from context or executionContext
		const userId = (context as any).userId || "unknown";

		console.log("--------TENANT--------------");

		// Simulate tenant not found scenario
		if (userId === "user-without-tenant") {
			console.log(
				`[Tenant Middleware] No tenant found for user ${userId} - returning error`,
			);
			return Result.error(new TenantNotFoundError(userId));
		}

		// In a real app, you'd extract tenant from subdomain or header in executionContext
		const mockTenant = {
			tenantId: "tenant-456",
			tenantName: "Acme Corp",
		};

		console.log(
			"[Tenant Middleware] Adding tenant to context:",
			mockTenant.tenantName,
		);

		return Result.ok(mockTenant);
	}
}
