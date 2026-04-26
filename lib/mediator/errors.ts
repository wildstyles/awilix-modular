export class CannotConstructMediatorDirectly extends Error {
	constructor() {
		super(
			"Cannot construct Mediator directly. Use Mediator.initialize() instead.",
		);
	}
}

export class HandlerAlreadyRegisteredError extends Error {
	constructor(handlerKey: string) {
		super(`Handler "${handlerKey}" already registered!`);
		this.name = "HandlerAlreadyRegisteredError";
	}
}

export class MiddlewareDependencyNotSatisfiedError extends Error {
	constructor(handlerKey: string, middlewareTag: string, requiredTag: string) {
		super(
			`Handler "${handlerKey}": Middleware '${middlewareTag}' requires '${requiredTag}', ` +
				`but '${requiredTag}' will not run. Ensure '${requiredTag}' is included and not excluded.`,
		);
		this.name = "MiddlewareDependencyNotSatisfiedError";
	}
}

export class DuplicateMiddlewareError extends Error {
	constructor(middlewareTag: string) {
		super(
			`Middleware '${middlewareTag}' has already been added. ` +
				`Each middleware can only be added once.`,
		);
		this.name = "DuplicateMiddlewareError";
	}
}

export class MiddlewareRequiresDependencyError extends Error {
	constructor(middlewareTag: string, requiredTag: string) {
		super(
			`Middleware '${middlewareTag}' requires '${requiredTag}' to be added first. ` +
				`Make sure to call addMiddleware('${requiredTag}') before adding '${middlewareTag}'.`,
		);
		this.name = "MiddlewareRequiresDependencyError";
	}
}

export class HandlerNotRegisteredError extends Error {
	constructor(handlerKey: string, moduleName: string) {
		super(
			`Handler key of ${handlerKey} is not registered in module: "${moduleName}"`,
		);
		this.name = "HandlerNotRegisteredError";
	}
}

export class InvalidMiddlewareReturnValueError extends Error {
	constructor(middlewareKey: string, returnedType: string) {
		super(
			`Middleware "${middlewareKey}" returned invalid value of type "${returnedType}". ` +
				`Middlewares must return a Result type or a plain object for context merging.`,
		);
		this.name = "InvalidMiddlewareReturnValueError";
	}
}

export class ContextKeyConflictError extends Error {
	constructor(middlewareKey: string, conflictingKeys: string[]) {
		super(
			`Middleware "${middlewareKey}" tried to add context keys that already exist: ${conflictingKeys.join(", ")}. ` +
				`Each middleware must add unique keys to the context.`,
		);
		this.name = "ContextKeyConflictError";
	}
}

export class MiddlewareRequiredError extends Error {
	constructor(middlewareKey: string, requiredKey: string) {
		super(
			`Middleware "${middlewareKey}" requires "${requiredKey}" to run before it. ` +
				`Ensure "${requiredKey}" is included and appears before "${middlewareKey}" in the execution order.`,
		);
		this.name = "MiddlewareRequiredError";
	}
}
