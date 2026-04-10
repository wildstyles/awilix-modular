import type { MiddlewareConfig } from "awilix-modular";

export const authMiddleware: MiddlewareConfig<"auth"> = {
	tag: "auth",
	execute: async (payload, context, next) => {
		const mockUser = {
			userId: "user-123",
			roles: ["admin", "user"],
		};

		console.log("[Auth Middleware] Adding user to context:", mockUser.userId);

		return next(payload, {
			...context,
			...mockUser,
		});
	},
};

export const loggingMiddleware: MiddlewareConfig<"logging"> = {
	tag: "logging",
	execute: async (payload, context, next) => {
		const requestId = `req-${Math.random().toString(36).substring(7)}`;
		const timestamp = Date.now();

		console.log(
			`[Logging Middleware] Request ${requestId} started at ${timestamp}`,
		);

		return next(payload, {
			...context,
			requestId,
			timestamp,
		});
	},
};

export const tenantMiddleware: MiddlewareConfig<"tenant", "auth"> = {
	tag: "tenant",
	requires: "auth", // ✅ Constrained to the second generic parameter!
	execute: async (payload, context, next) => {
		// context is now typed! It has userId and roles from auth middleware
		// Try typing "context." and you'll see autocomplete for userId, roles
		console.log(
			`[Tenant Middleware] User ${context.userId} with roles ${context.roles.join(", ")}`,
		);

		// In a real app, you'd extract tenant from subdomain or header
		const mockTenant = {
			tenantId: "tenant-456",
			tenantName: "Acme Corp",
		};

		console.log(
			"[Tenant Middleware] Adding tenant to context:",
			mockTenant.tenantName,
		);

		// ✅ next() now REQUIRES both auth context AND tenant context!
		// Try removing tenantId - TypeScript will error!
		return next(payload, {
			...context, // auth properties: userId, roles
			...mockTenant, // tenant properties: tenantId, tenantName (REQUIRED!)
		});
	},
};
