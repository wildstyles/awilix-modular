import type { AnyContract } from "./handler.types.js";
import type { ExecuteResponseByOptions } from "./mediator-utilities.types.js";
import type { ExecutionContext, Middleware } from "./middleware.types.js";

// ============================================================================
// Middleware Configuration
// ============================================================================

export type MiddlewareResolver = () => Middleware;

export type MiddlewareResolverMap = Map<string, () => Middleware>;

// ============================================================================
// Execute Options Types
// ============================================================================

export type ExecutePreHandlerOptions<TPreHandlerKey extends string = string> = {
	scenario?: never;
	includePreHandlers?: readonly TPreHandlerKey[];
	excludePreHandlers?: readonly TPreHandlerKey[];
};

// ============================================================================
// Scenario Extraction Utilities
// ============================================================================

type ExtractExecuteScenarios<
	C extends AnyContract,
	K extends keyof C,
> = C[K] extends { executeScenarios: infer S } ? S : never;

type ExtractScenarioByName<
	C extends AnyContract,
	K extends keyof C,
	Name extends string,
> = Extract<ExtractExecuteScenarios<C, K>, { name: Name }>;

type ExtractScenarioName<C extends AnyContract, K extends keyof C> =
	ExtractExecuteScenarios<C, K> extends { name: infer Name extends string }
		? Name
		: never;

type ExtractScenarioIncludedPreHandlers<
	C extends AnyContract,
	K extends keyof C,
	Name extends string,
> =
	ExtractScenarioByName<C, K, Name> extends {
		includePreHandlers: infer Include extends readonly any[];
	}
		? Include
		: never;

type ExtractScenarioExcludedPreHandlers<
	C extends AnyContract,
	K extends keyof C,
	Name extends string,
> =
	ExtractScenarioByName<C, K, Name> extends {
		excludePreHandlers: infer Exclude extends readonly any[];
	}
		? Exclude
		: never;

type ScenarioIncludeOption<
	C extends AnyContract,
	K extends keyof C,
	Name extends string,
> = [ExtractScenarioIncludedPreHandlers<C, K, Name>] extends [never]
	? { includePreHandlers?: never }
	: { includePreHandlers: ExtractScenarioIncludedPreHandlers<C, K, Name> };

type ScenarioExcludeOption<
	C extends AnyContract,
	K extends keyof C,
	Name extends string,
> = [ExtractScenarioExcludedPreHandlers<C, K, Name>] extends [never]
	? { excludePreHandlers?: never }
	: { excludePreHandlers: ExtractScenarioExcludedPreHandlers<C, K, Name> };

type ExecuteScenarioOptions<
	C extends AnyContract,
	K extends keyof C,
	TPreHandlerKey extends string,
> = {
	[Name in ExtractScenarioName<C, K>]: {
		scenario: Name;
	} & ScenarioIncludeOption<C, K, Name> &
		ScenarioExcludeOption<C, K, Name>;
}[ExtractScenarioName<C, K>];

export type ExecuteOptions<
	C extends AnyContract,
	K extends keyof C,
	TPreHandlerKey extends string,
> = [ExtractExecuteScenarios<C, K>] extends [never]
	? ExecutePreHandlerOptions<TPreHandlerKey>
	: ExecuteScenarioOptions<C, K, TPreHandlerKey>;

// ============================================================================
// Execute Runtime Options Type
// ============================================================================

export type ExecuteRuntimeOptions<
	C extends AnyContract,
	K extends keyof C,
	TPreHandlerKey extends string,
> = {
	executionContext?: ExecutionContext;
} & ExecuteOptions<C, K, TPreHandlerKey>;

// ============================================================================
// Execute Response Type
// ============================================================================

export type ExecuteResponse<
	C extends AnyContract,
	K extends keyof C,
	TPreHandlerKey extends string,
	TPreHandlerErrorMap extends Record<string, unknown>,
	TOptions,
> = ExecuteResponseByOptions<
	C,
	K,
	TPreHandlerKey,
	TPreHandlerErrorMap,
	TOptions
>;
