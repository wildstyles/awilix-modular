import type { EmptyObject } from "../common.types.js";
import type {
	ModuleImport,
	StaticModule,
	StaticModuleDef,
} from "../module.types.js";
import type { DefPreHandlerMap } from "../provider.types.js";

// ============================================================================
// Common Key Types
// ============================================================================

export type PreHandlerExportKey =
	| "queryPreHandlerExports"
	| "commandPreHandlerExports";

// ============================================================================
// Module Definition Extraction
// ============================================================================

/**
 * Extracts the module definition from a module import.
 * Works with both StaticModule wrappers and plain module definitions.
 */
export type ExtractModuleDef<T> =
	T extends StaticModule<infer TDef extends StaticModuleDef>
		? TDef
		: T extends Record<string, unknown>
			? T
			: never;

// ============================================================================
// PreHandler Utilities
// ============================================================================

/**
 * Validates and normalizes a type to DefPreHandlerMap or EmptyObject.
 */
export type ToPreHandlerMap<T> = [T] extends [DefPreHandlerMap]
	? T
	: EmptyObject;

/**
 * Extracts preHandler keys from a preHandler map.
 */
export type ExtractPreHandlerKeys<TPreHandlers> =
	TPreHandlers extends DefPreHandlerMap
		? Extract<keyof TPreHandlers, string>
		: never;

/**
 * Extracts exported preHandlers from a module definition.
 */
export type ExtractExportedPreHandlers<
	TModuleDef,
	TExportKey extends PreHandlerExportKey,
> = TModuleDef extends { [K in TExportKey]?: infer E }
	? [NonNullable<E>] extends [EmptyObject]
		? never
		: [NonNullable<E>] extends [DefPreHandlerMap]
			? NonNullable<E>
			: never
	: never;

/**
 * Extracts exported preHandler map from a module definition.
 * Returns EmptyObject instead of never when not found.
 */
export type ExtractExportedPreHandlerMap<
	TModuleDef,
	TExportKey extends PreHandlerExportKey,
> = TModuleDef extends { [K in TExportKey]?: infer E }
	? [NonNullable<E>] extends [DefPreHandlerMap]
		? NonNullable<E>
		: EmptyObject
	: EmptyObject;

/**
 * Recursively extracts and merges preHandler maps from module imports.
 */
export type ExtractPreHandlerMapFromImports<
	TImports extends readonly ModuleImport[] | undefined,
	TExportKey extends PreHandlerExportKey,
> = TImports extends readonly [
	infer First,
	...infer Rest extends readonly ModuleImport[],
]
	? ExtractExportedPreHandlerMap<ExtractModuleDef<First>, TExportKey> &
			ExtractPreHandlerMapFromImports<Rest, TExportKey>
	: EmptyObject;

// ============================================================================
// Middleware Contract Extraction
// ============================================================================

/**
 * Extracts the contract from a middleware definition.
 * Handles both direct contracts, class-based handlers, and useClass patterns.
 */
export type ExtractMiddlewareContract<M> = M extends {
	readonly contract: infer C;
}
	? C
	: M extends new (
				...args: any[]
			) => infer I
		? I extends { readonly contract: infer C }
			? C
			: never
		: M extends { useClass: infer U }
			? ExtractMiddlewareContract<U>
			: never;

// ============================================================================
// Context Extraction from Contracts
// ============================================================================

/**
 * Extracts context data from a contract's return type.
 */
export type ExtractContextFromContract<T> =
	T extends Record<string, any>
		? T[keyof T] extends { returnType: infer R }
			? ExtractContextData<R>
			: never
		: never;

/**
 * Extracts the data portion from a Result type or plain object.
 * Handles both Result<Data, Error> and plain Record types.
 */
export type ExtractContextData<T> = T extends
	| { readonly ok: true; readonly value: infer Data }
	| { readonly ok: false; readonly error: any }
	? Data extends Record<string, unknown>
		? Data
		: never
	: T extends Record<string, unknown>
		? T
		: never;

/**
 * Combines contract and middleware extraction for context.
 */
export type ExtractContextFromMiddleware<M> = ExtractContextFromContract<
	ExtractMiddlewareContract<M>
>;

// ============================================================================
// Error Extraction from Contracts
// ============================================================================

/**
 * Extracts error type from a Result contract.
 */
export type ExtractResultError<T> = T extends {
	readonly ok: false;
	readonly error: infer E;
}
	? E
	: never;

/**
 * Extracts error from a contract's return type.
 */
export type ExtractErrorFromContract<T> =
	T extends Record<string, any>
		? T[keyof T] extends { returnType: infer R }
			? ExtractResultError<R>
			: never
		: never;

/**
 * Combines contract and middleware extraction for errors.
 */
export type ExtractErrorFromMiddleware<M> = ExtractErrorFromContract<
	ExtractMiddlewareContract<M>
>;
