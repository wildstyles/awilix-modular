export class HandlerAlreadyRegisteredError extends Error {
	constructor(handlerKey: string) {
		super(`Handler "${handlerKey}" already registered!`);
		this.name = "HandlerAlreadyRegisteredError";
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
