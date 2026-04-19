import type { AnyContract } from "./contract.types.js";
import type { ExecutionContext } from "./middleware.types.js";

// ============================================================================
// Public API
// ============================================================================

// Execute API Types
export type ExtractScenarioName<
	C extends AnyContract,
	K extends C["key"],
> = Extract<keyof ExtractContractScenarios<C, K>, string>;

export type ExecuteResponseByScenario<
	C extends AnyContract,
	K extends C["key"],
	Name extends ExtractScenarioName<C, K>,
> = ExtractScenarioReturnType<C, K, Name>;

export type ExecuteRuntimeOptions<
	C extends AnyContract,
	K extends C["key"],
> = ExecutionContextOption & ExecuteOptions<C, K>;

export type ExecuteArgs<
	C extends AnyContract,
	K extends C["key"],
	TOptions extends ExecuteRuntimeOptions<C, K> = ExecuteRuntimeOptions<C, K>,
> =
	IsExecuteOptionsRequired<C, K> extends true
		? [options: TOptions]
		: [options?: never];

export type ExecuteResponse<
	C extends AnyContract,
	K extends C["key"],
> = ExtractContractReturnType<C, K>;

// ============================================================================
// Contract Extraction Helpers
// ============================================================================

type ExtractContractScenarios<C extends AnyContract, K extends C["key"]> =
	Extract<C, { key: K }> extends {
		scenarios: infer S extends Record<string, unknown>;
	}
		? S
		: never;

// ============================================================================
// Scenario Helpers
// ============================================================================

type ExtractScenarioByName<
	C extends AnyContract,
	K extends C["key"],
	Name extends string,
> = Name extends keyof ExtractContractScenarios<C, K>
	? ExtractContractScenarios<C, K>[Name]
	: never;

type ExtractScenarioConfig<
	C extends AnyContract,
	K extends C["key"],
	Name extends string,
> =
	ExtractScenarioByName<C, K, Name> extends { config: infer Config }
		? Config
		: never;

type ExtractScenarioReturnType<
	C extends AnyContract,
	K extends C["key"],
	Name extends string,
> =
	ExtractScenarioByName<C, K, Name> extends { returnType: infer ReturnType }
		? ReturnType
		: ExtractContractReturnType<C, K>;

// ============================================================================
// Execute Options Helpers
// ============================================================================

type ExecuteNoScenarioOptions = {
	scenario?: never;
	includePreHandlerKeys?: never;
	excludePreHandlerKeys?: never;
};

type ExecuteOptions<C extends AnyContract, K extends C["key"]> = [
	ExtractContractScenarios<C, K>,
] extends [never]
	? ExecuteNoScenarioOptions
	: ExecuteScenarioOptions<C, K>;

type ScenarioIncludeOption<
	C extends AnyContract,
	K extends C["key"],
	Name extends string,
> =
	ExtractScenarioConfig<C, K, Name> extends {
		includePreHandlerKeys: infer Include extends readonly any[];
	}
		? { includePreHandlerKeys: Include }
		: {
				includePreHandlerKeys?: never;
			};

type ScenarioExcludeOption<
	C extends AnyContract,
	K extends C["key"],
	Name extends string,
> =
	ExtractScenarioConfig<C, K, Name> extends {
		excludePreHandlerKeys: infer Exclude extends readonly any[];
	}
		? { excludePreHandlerKeys: Exclude }
		: {
				excludePreHandlerKeys?: never;
			};

type ExecuteScenarioOptions<C extends AnyContract, K extends C["key"]> = {
	[Name in ExtractScenarioName<C, K>]: {
		scenario: Name;
	} & ScenarioIncludeOption<C, K, Name> &
		ScenarioExcludeOption<C, K, Name>;
}[ExtractScenarioName<C, K>];

// ============================================================================
// Runtime Option Helpers
// ============================================================================

type ExecutionContextOption = [keyof ExecutionContext] extends [never]
	? { executionContext?: never }
	: { executionContext: ExecutionContext };

type HasScenarios<C extends AnyContract, K extends C["key"]> = [
	ExtractContractScenarios<C, K>,
] extends [never]
	? false
	: true;

type IsExecutionContextRequired = [keyof ExecutionContext] extends [never]
	? false
	: true;

type IsExecuteOptionsRequired<C extends AnyContract, K extends C["key"]> =
	HasScenarios<C, K> extends true ? true : IsExecutionContextRequired;

// ============================================================================
// Return Type Helpers
// ============================================================================

type ExtractContractReturnType<C extends AnyContract, K extends C["key"]> =
	Extract<C, { key: K }> extends { returnType: infer ReturnType }
		? ReturnType
		: Extract<C, { key: K }>["response"];
