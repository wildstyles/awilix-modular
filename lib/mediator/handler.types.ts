import type {
	ContextFromTags,
	EmptyContext,
	MiddlewareErrorRegistry,
	MiddlewareTagRegistry,
} from "./middleware.types.js";

/**
 * Generic Result type - structural match for Result pattern
 */
type Result<Value, Err> =
	| { readonly ok: true; readonly value: Value; readonly error: undefined }
	| { readonly ok: false; readonly value: undefined; readonly error: Err };

export type HandlerExecuteScenario<
	Name extends string = string,
	IncludePreHandlers extends readonly string[] | undefined = undefined,
	ExcludePreHandlers extends readonly string[] | undefined = undefined,
> = {
	readonly name: Name;
	readonly includePreHandlers?: IncludePreHandlers;
	readonly excludePreHandlers?: ExcludePreHandlers;
};

type AnyHandlerExecuteScenario = HandlerExecuteScenario<
	string,
	readonly string[] | undefined,
	readonly string[] | undefined
>;

type ExtractScenarioContext<TScenarios> = TScenarios extends {
	readonly context: infer Ctx;
}
	? Ctx
	: never;

export interface Handler<
	C extends AnyContract,
	Ctx extends ContextFromTags = ContextFromTags,
	TScenarios extends AnyHandlerExecuteScenario = never,
	K extends keyof C = keyof C,
> {
	readonly contract: C;
	readonly executeScenarios?: TScenarios;
	executor: Executor<
		ExtractPayload<C, K>,
		ExtractResponse<C, K>,
		Ctx &
			([TScenarios] extends [never]
				? EmptyContext
				: ExtractScenarioContext<TScenarios>)
	>;
}

export type Executor<
	P = unknown,
	R = unknown,
	Ctx extends ContextFromTags = ContextFromTags,
> = (payload: P, context: Ctx) => Promise<R>;

export type Contract<K extends string, P, R, TScenarios = never> = {
	[Key in K]: {
		payload: P;
		response: R;
	} & ([TScenarios] extends [never]
		? EmptyContext
		: { executeScenarios: TScenarios });
};

export type AnyContract = Contract<string, unknown, unknown>;

export type ExtractPayload<
	C extends AnyContract,
	K extends keyof C,
> = C[K]["payload"];

export type ExtractResponse<
	C extends AnyContract,
	K extends keyof C,
> = C[K]["response"];

/**
 * Extract success type from Result
 */
type ExtractResultSuccess<R> = R extends {
	readonly ok: true;
	readonly value: infer T;
}
	? T
	: never;

/**
 * Extract error type from Result
 */
type ExtractResultError<R> = R extends {
	readonly ok: false;
	readonly error: infer E;
}
	? E
	: never;

/**
 * Check if type is a Result
 */
type IsResult<R> = R extends
	| { readonly ok: true; readonly value: any }
	| { readonly ok: false; readonly error: any }
	? true
	: false;

/**
 * Get all non-never error types from MiddlewareErrorRegistry
 * Exported for debugging
 */
export type AllMiddlewareErrors = keyof MiddlewareTagRegistry extends never
	? never
	: Exclude<MiddlewareErrorRegistry[keyof MiddlewareTagRegistry], never>;

/**
 * Merge all middleware errors with handler response
 * If no middleware errors registered - return response as-is
 * If response is Result<S, E>, returns Result<S, E | UnauthorizedError | TenantNotFoundError | ...>
 * If response is plain type S, returns Result<S, UnauthorizedError | TenantNotFoundError | ...>
 */
export type ResponseWithMiddlewareErrors<Response> = [
	AllMiddlewareErrors,
] extends [never]
	? Response // No middleware errors - return as-is
	: IsResult<Response> extends true
		? Result<
				ExtractResultSuccess<Response>,
				ExtractResultError<Response> | AllMiddlewareErrors
			>
		: Result<Response, AllMiddlewareErrors>;

/**
 * Extract response from contract and merge with all middleware errors
 */
export type ExtractResponseWithMiddlewareErrors<
	C extends AnyContract,
	K extends keyof C,
> = ResponseWithMiddlewareErrors<ExtractResponse<C, K>>;
