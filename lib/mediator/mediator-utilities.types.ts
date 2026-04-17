import type { Result } from "../result/result.js";
import type { AnyContract, ExtractResponse } from "./handler.types.js";

// ============================================================================
// PreHandler Key Selection Utilities
// ============================================================================

/**
 * Extracts the included preHandler keys from options.
 * If no includePreHandlers is specified, returns all available keys.
 */
export type ExtractIncludedPreHandlerKeys<
	TPreHandlerKey extends string,
	TOptions,
> = TOptions extends {
	includePreHandlers: infer Include extends readonly any[];
}
	? Extract<Include[number], TPreHandlerKey>
	: TPreHandlerKey;

/**
 * Extracts the excluded preHandler keys from options.
 */
export type ExtractExcludedPreHandlerKeys<
	TPreHandlerKey extends string,
	TOptions,
> = TOptions extends {
	excludePreHandlers: infer Exclude extends readonly any[];
}
	? Extract<Exclude[number], TPreHandlerKey>
	: never;

/**
 * Determines the final set of preHandler keys after applying include/exclude logic.
 */
export type ExtractSelectedPreHandlerKeys<
	TPreHandlerKey extends string,
	TOptions,
> = Exclude<
	ExtractIncludedPreHandlerKeys<TPreHandlerKey, TOptions>,
	ExtractExcludedPreHandlerKeys<TPreHandlerKey, TOptions>
>;

// ============================================================================
// PreHandler Error Extraction
// ============================================================================

/**
 * Extracts the preHandler error map from a contract, falling back to the provided map.
 */
export type ExtractPreHandlerErrorsMap<
	C extends AnyContract,
	K extends keyof C,
	TPreHandlerErrorMap extends Record<string, unknown>,
> = C[K] extends { preHandlerErrors: infer M extends Record<string, unknown> }
	? M
	: TPreHandlerErrorMap;

/**
 * Extracts only the errors from preHandlers that are selected in the options.
 */
export type ExtractSelectedPreHandlerErrors<
	TPreHandlerErrorMap extends Record<string, unknown>,
	TPreHandlerKey extends string,
	TOptions,
> =
	Extract<
		keyof TPreHandlerErrorMap,
		ExtractSelectedPreHandlerKeys<TPreHandlerKey, TOptions>
	> extends infer TKey extends string
		? [TKey] extends [never]
			? never
			: {
					[K in TKey]: TPreHandlerErrorMap[K];
				}[TKey]
		: never;

// ============================================================================
// Response Type Merging
// ============================================================================

/**
 * Merges handler response type with preHandler error types.
 * Handles both Result types and plain types.
 */
export type MergeResponseWithPreHandlerErrors<TResponse, TPreHandlerError> = [
	TPreHandlerError,
] extends [never]
	? TResponse
	: [TResponse] extends [{ readonly ok: true; readonly value: infer V }]
		? Result<V, TPreHandlerError>
		: [TResponse] extends [{ readonly ok: false; readonly error: infer E }]
			? Result<never, E | TPreHandlerError>
			: [TResponse] extends [
						| { readonly ok: true; readonly value: infer V }
						| { readonly ok: false; readonly error: infer E },
					]
				? Result<V, E | TPreHandlerError>
				: Result<TResponse, TPreHandlerError>;

/**
 * Computes the final response type based on execute options.
 */
export type ExecuteResponseByOptions<
	C extends AnyContract,
	K extends keyof C,
	TPreHandlerKey extends string,
	TPreHandlerErrorMap extends Record<string, unknown>,
	TOptions,
> = MergeResponseWithPreHandlerErrors<
	ExtractResponse<C, K>,
	ExtractSelectedPreHandlerErrors<
		ExtractPreHandlerErrorsMap<C, K, TPreHandlerErrorMap>,
		TPreHandlerKey,
		TOptions
	>
>;
