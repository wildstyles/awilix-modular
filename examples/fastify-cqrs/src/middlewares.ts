import type { MiddlewareConfig } from "awilix-modular";

export const authMiddleware: MiddlewareConfig<"auth"> = {
	tag: "auth",
	execute: async (payload, meta, next) => {
		const mockUser = {
			userId: "user-123",
			roles: ["admin", "user"],
		};

		console.log("[Auth Middleware] Adding user to meta:", mockUser.userId);

		return next(payload, {
			...meta,
			...mockUser,
		});
	},
};

export const loggingMiddleware: MiddlewareConfig<"logging"> = {
	tag: "logging",
	execute: async (payload, meta, next) => {
		const requestId = `req-${Math.random().toString(36).substring(7)}`;
		const timestamp = Date.now();

		console.log(
			`[Logging Middleware] Request ${requestId} started at ${timestamp}`,
		);

		return next(payload, {
			...meta,
			requestId,
			timestamp,
		});
	},
};

export const tenantMiddleware: MiddlewareConfig<"tenant", "auth"> = {
	tag: "tenant",
	requires: "auth", // ✅ Constrained to the second generic parameter!
	execute: async (payload, meta, next) => {
		// meta is now typed! It has userId and roles from auth middleware
		// Try typing "meta." and you'll see autocomplete for userId, roles
		console.log(
			`[Tenant Middleware] User ${meta.userId} with roles ${meta.roles.join(", ")}`,
		);

		// In a real app, you'd extract tenant from subdomain or header
		const mockTenant = {
			tenantId: "tenant-456",
			tenantName: "Acme Corp",
		};

		console.log(
			"[Tenant Middleware] Adding tenant to meta:",
			mockTenant.tenantName,
		);

		// ✅ next() now REQUIRES both auth meta AND tenant meta!
		// Try removing tenantId - TypeScript will error!
		return next(payload, {
			...meta, // auth properties: userId, roles
			...mockTenant, // tenant properties: tenantId, tenantName (REQUIRED!)
		});
	},
};
