// biome-ignore lint/suspicious/noEmptyInterface: Intentionally empty for declaration merging
export interface ExecutionContext {}

/**
 * Registry for middleware return types
 * Each tag maps to either:
 * - Result<ContextData, ErrorType> - middleware that can return errors
 * - ContextData - middleware that always succeeds
 *
 * @example
 * interface MiddlewareTagRegistry {
 *   auth: Result<{ userId: string, roles: string[] }, UnauthorizedError>;
 *   logging: { requestId: string, timestamp: number };
 * }
 */
// biome-ignore lint/suspicious/noEmptyInterface: Intentionally empty for declaration merging
export interface MiddlewareTagRegistry {}

// biome-ignore lint/suspicious/noEmptyInterface: Intentionally empty for declaration merging
export interface ContextFromTags {}

/**
 * Extract context data from middleware return type
 * If T is Result<Data, Error>, extracts Data
 * Otherwise returns T as-is
 * Ensures result is always an object type (AnyContext compatible)
 */
export type ExtractMiddlewareContext<T> = T extends
	| { readonly ok: true; readonly value: infer Data }
	| { readonly ok: false; readonly error: any }
	? Data extends AnyContext
		? Data
		: never
	: T extends AnyContext
		? T
		: never;

/**
 * Extract error type from middleware return type
 * If T is Result<Data, Error>, extracts Error
 * Otherwise returns never
 */
type ExtractMiddlewareError<T> = T extends {
	readonly ok: false;
	readonly error: infer Err;
}
	? Err
	: never;

/**
 * Build MiddlewareErrorRegistry from MiddlewareTagRegistry
 * Automatically extracts error types from Result returns
 */
export type MiddlewareErrorRegistry = {
	[K in keyof MiddlewareTagRegistry]: ExtractMiddlewareError<
		MiddlewareTagRegistry[K]
	>;
};

// Default context when no tags specified
// biome-ignore lint/complexity/noBannedTypes: {} is the correct type for empty object
export type EmptyContext = {};

export type AnyContext = Record<string, unknown>;

/**
 * Middleware contract - similar to Handler Contract
 * Defines the tag and return type for a middleware
 * @param Tag - The middleware tag (unique identifier)
 * @param ReturnType - What the middleware returns (context data or Result)
 * @param RequiredTag - Optional tag this middleware depends on
 */
export type MiddlewareContract<K extends string, ReturnType> = {
	[Key in K]: {
		returnType: ReturnType;
	};
};

export type AnyMiddlewareContract = MiddlewareContract<string, unknown>;

/**
 * Extract return type from middleware contract
 */
export type MiddlewareFn<
	RequiredContext extends AnyContext = EmptyContext,
	ReturnType = unknown,
> = (
	payload: unknown,
	context: RequiredContext,
	executionContext: ExecutionContext,
) => Promise<ReturnType>;

export interface Middleware<
	C extends AnyMiddlewareContract = AnyMiddlewareContract,
> {
	readonly contract: C;
	execute: MiddlewareFn;
}
