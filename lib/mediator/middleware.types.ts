import type { Result } from "./result.js";

type EmptyObject = Record<never, never>;

// biome-ignore lint/suspicious/noEmptyInterface: Intentionally empty for declaration merging
export interface ExecutionContext {}

// Default context when no tags specified
export type EmptyContext = EmptyObject;
export type AnyMiddlewareContract = MiddlewareContract<string, unknown, any>;
export type AnyContext = Record<string, unknown>;
export type MiddlewareResolver = () => Middleware;
export type MiddlewareResolverMap = Map<string, () => Middleware>;

export type Middleware<
	C extends AnyMiddlewareContract = AnyMiddlewareContract,
> = MiddlewareRequires<C> & {
	readonly contract: C;
	execute: MiddlewareFn<
		ExtractContractContext<C>,
		ExtractMiddlewareReturnType<C>
	>;
};
/**
 * Extract context data from middleware return type
 * If T is Result<Data, Error>, extracts Data
 * Otherwise returns T as-is
 * Ensures result is always an object type (AnyContext compatible)
 */
export type ExtractMiddlewareContext<T> = [T] extends [Result<infer Data, any>]
	? Data extends Record<string, unknown>
		? Data
		: EmptyObject
	: T extends Record<string, unknown>
		? T
		: EmptyObject;

export type MiddlewareContract<
	K extends string,
	ReturnType,
	RequiredContracts extends readonly AnyMiddlewareContract[] = readonly [],
> = {
	key: K;
	returnType: ReturnType;
	requires: ExtractRequiredKeysTupleFromContracts<RequiredContracts>;
	context: MergeContextFromContracts<RequiredContracts>;
};

type ExtractRequiredKeysTupleFromContracts<
	Contracts extends readonly AnyMiddlewareContract[],
> = number extends Contracts["length"]
	? readonly string[]
	: Contracts extends readonly []
		? readonly []
		: Contracts extends readonly [infer First, ...infer Rest]
			? First extends AnyMiddlewareContract
				? Rest extends readonly AnyMiddlewareContract[]
					? readonly [
							First["key"],
							...ExtractRequiredKeysTupleFromContracts<Rest>,
						]
					: readonly [First["key"]]
				: readonly []
			: readonly [];

/**
 * Merge all contexts from required contracts
 */
type MergeContextFromContracts<
	Contracts extends readonly AnyMiddlewareContract[],
> = number extends Contracts["length"]
	? AnyContext
	: Contracts extends readonly []
		? EmptyObject
		: Contracts extends readonly [infer First, ...infer Rest]
			? First extends AnyMiddlewareContract
				? Rest extends readonly AnyMiddlewareContract[]
					? ExtractMiddlewareContext<First["returnType"]> &
							MergeContextFromContracts<Rest>
					: ExtractMiddlewareContext<First["returnType"]>
				: EmptyObject
			: EmptyObject;

type ExtractMiddlewareReturnType<C extends AnyMiddlewareContract> =
	C["returnType"];

/**
 * Extract required keys from middleware contract
 */
type ExtractRequiredKeys<C extends AnyMiddlewareContract> =
	C["requires"][number];

type ExtractRequiredList<C extends AnyMiddlewareContract> = C["requires"];

/**
 * Extract context from middleware contract
 */
type ExtractContractContext<C extends AnyMiddlewareContract> = C["context"];

/**
 * Middleware execute function with typed context and return type
 */
type MiddlewareFn<
	RequiredContext extends AnyContext = EmptyContext,
	ReturnType = unknown,
> = (
	payload: unknown,
	context: RequiredContext,
	executionContext: ExecutionContext,
) => Promise<ReturnType>;

type MiddlewareRequires<C extends AnyMiddlewareContract> = [
	ExtractRequiredKeys<C>,
] extends [never]
	? { readonly requires?: readonly [] }
	: string extends ExtractRequiredKeys<C>
		? { readonly requires?: readonly string[] }
		: { readonly requires: ExtractRequiredList<C> };
