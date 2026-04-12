export class UnauthorizedError extends Error {
	static readonly CODE = "auth.unauthorized";
	readonly code = UnauthorizedError.CODE;

	constructor(message = "Unauthorized - invalid or missing token") {
		super(message);
		this.name = "UnauthorizedError";
	}
}

export class TenantNotFoundError extends Error {
	static readonly CODE = "tenant.not_found";
	readonly code = TenantNotFoundError.CODE;

	constructor(public readonly userId: string) {
		super(`Tenant not found for user ${userId}`);
		this.name = "TenantNotFoundError";
	}
}

export class LoggerError extends Error {
	static readonly CODE = "logger.not_found";
	readonly code = LoggerError.CODE;

	constructor() {
		super(`Something wrong with logger`);
		this.name = "LoggerError";
	}
}

export class CatsNotFoundError extends Error {
	static readonly CODE = "cats.not_found";
	readonly code = CatsNotFoundError.CODE;

	constructor(public readonly tenantId: string) {
		super(`No cats found for tenant ${tenantId}`);
		this.name = "CatsNotFoundError";
	}
}
