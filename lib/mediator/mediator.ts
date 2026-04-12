import * as errors from "./errors.js";
import type {
	AnyContract,
	Executor,
	ExtractPayload,
	ExtractResponse,
} from "./handler.types.js";
import type { Result } from "../result/result.js";
import type {
	AnyContext,
	ExecutionContext,
	MiddlewareTagRegistry,
} from "./middleware.types.js";

type HandlerMiddlewareOptions = {
	middlewareTags?: readonly (keyof MiddlewareTagRegistry)[];
	excludeMiddlewareTags?: readonly (keyof MiddlewareTagRegistry)[];
};

export type ExecutePreHandlerOptions<
	TPreHandlerKey extends string = never,
> = {
	scenario?: never;
	includePreHandlers?: readonly TPreHandlerKey[];
	excludePreHandlers?: readonly TPreHandlerKey[];
	// Backward-compatible typo alias
	inclulePreHandlers?: readonly TPreHandlerKey[];
};

type ExtractExecuteScenarios<
	C extends AnyContract,
	K extends keyof C,
> = C[K] extends { executeScenarios: infer S } ? S : never;

type ExtractExecuteScenarioByName<
	C extends AnyContract,
	K extends keyof C,
	Name extends string,
> = Extract<ExtractExecuteScenarios<C, K>, { name: Name }>;

type ExtractScenarioName<C extends AnyContract, K extends keyof C> =
	ExtractExecuteScenarios<C, K> extends { name: infer Name extends string }
		? Name
		: never;

type ScenarioIncludePreHandlersExact<
	C extends AnyContract,
	K extends keyof C,
	Name extends string,
> =
	ExtractExecuteScenarioByName<C, K, Name> extends {
		includePreHandlers: infer Include extends readonly any[];
	}
		? Include
		: never;

type ScenarioExcludePreHandlersExact<
	C extends AnyContract,
	K extends keyof C,
	Name extends string,
> =
	ExtractExecuteScenarioByName<C, K, Name> extends {
		excludePreHandlers: infer Exclude extends readonly any[];
	}
		? Exclude
		: never;

type ScenarioIncludeOption<
	C extends AnyContract,
	K extends keyof C,
	Name extends string,
> = [ScenarioIncludePreHandlersExact<C, K, Name>] extends [never]
	? {
			includePreHandlers?: never;
			inclulePreHandlers?: never;
		}
	: {
			includePreHandlers: ScenarioIncludePreHandlersExact<C, K, Name>;
			inclulePreHandlers?: never;
		};

type ScenarioExcludeOption<
	C extends AnyContract,
	K extends keyof C,
	Name extends string,
> = [ScenarioExcludePreHandlersExact<C, K, Name>] extends [never]
	? { excludePreHandlers?: never }
	: {
			excludePreHandlers: ScenarioExcludePreHandlersExact<C, K, Name>;
		};

type ExecutePreHandlerScenarioOptions<
	C extends AnyContract,
	K extends keyof C,
	TPreHandlerKey extends string,
> = {
	[Name in ExtractScenarioName<C, K>]: {
		scenario: Name;
	} & ScenarioIncludeOption<C, K, Name> &
		ScenarioExcludeOption<C, K, Name>;
}[ExtractScenarioName<C, K>];

type ExecuteOptions<
	C extends AnyContract,
	K extends keyof C,
	TPreHandlerKey extends string,
> = [ExtractExecuteScenarios<C, K>] extends [never]
	? ExecutePreHandlerOptions<TPreHandlerKey>
	: ExecutePreHandlerScenarioOptions<C, K, TPreHandlerKey>;

type ExecuteArgs<
	C extends AnyContract,
	K extends keyof C,
	TPreHandlerKey extends string,
> = [ExtractExecuteScenarios<C, K>] extends [never]
	? keyof ExecutionContext extends never
		? [
				executionContext?: AnyContext,
				preHandlerOptions?: ExecuteOptions<C, K, TPreHandlerKey>,
			]
		: [
				executionContext: ExecutionContext,
				preHandlerOptions?: ExecuteOptions<C, K, TPreHandlerKey>,
			]
	: keyof ExecutionContext extends never
		? [
				executionContext: AnyContext,
				preHandlerOptions: ExecuteOptions<C, K, TPreHandlerKey>,
			]
		: [
				executionContext: ExecutionContext,
				preHandlerOptions: ExecuteOptions<C, K, TPreHandlerKey>,
			];

type ExtractPreHandlerErrorsMap<
	C extends AnyContract,
	K extends keyof C,
	TPreHandlerErrorMap extends Record<string, unknown>,
> = C[K] extends { preHandlerErrors: infer M extends Record<string, unknown> }
	? M
	: TPreHandlerErrorMap;

type ExtractOptionsFromExecuteArgs<TArgs extends readonly unknown[]> =
	TArgs extends [any, infer TOptions] ? TOptions : never;

type ExtractIncludedPreHandlerKeys<
	TPreHandlerKey extends string,
	TOptions,
> = TOptions extends { includePreHandlers: infer Include extends readonly any[] }
	? Extract<Include[number], TPreHandlerKey>
	: TOptions extends {
				inclulePreHandlers: infer IncludeAlias extends readonly any[];
		  }
		? Extract<IncludeAlias[number], TPreHandlerKey>
		: TPreHandlerKey;

type ExtractExcludedPreHandlerKeys<
	TPreHandlerKey extends string,
	TOptions,
> = TOptions extends { excludePreHandlers: infer Exclude extends readonly any[] }
	? Extract<Exclude[number], TPreHandlerKey>
	: never;

type ExtractSelectedPreHandlerKeys<
	TPreHandlerKey extends string,
	TOptions,
> = Exclude<
	ExtractIncludedPreHandlerKeys<TPreHandlerKey, TOptions>,
	ExtractExcludedPreHandlerKeys<TPreHandlerKey, TOptions>
>;

type ExtractSelectedPreHandlerErrors<
	TPreHandlerErrorMap extends Record<string, unknown>,
	TPreHandlerKey extends string,
	TOptions,
> = Extract<keyof TPreHandlerErrorMap, ExtractSelectedPreHandlerKeys<
	TPreHandlerKey,
	TOptions
>> extends infer TKey extends string
	? [TKey] extends [never]
		? never
		: {
				[K in TKey]: TPreHandlerErrorMap[K];
			}[TKey]
	: never;

type MergeResponseWithPreHandlerErrors<TResponse, TPreHandlerError> = [
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

type ExecuteResponseByOptions<
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

interface HandlerRegistration extends HandlerMiddlewareOptions {
	executor: Executor;
}

export class Mediator<
	C extends AnyContract,
	TPreHandlerKey extends string = never,
	TPreHandlerErrorMap extends Record<string, unknown> = Record<never, never>,
> {
	private handlers = new Map<string, HandlerRegistration>();
	private middlewares: any[];
	private moduleName: string;

	constructor(middlewares: any[], moduleName: string) {
		this.moduleName = moduleName;
		this.middlewares = middlewares;
	}

	register(
		key: string,
		executor: Executor,
		options?: HandlerMiddlewareOptions,
	): void {
		const keyStr = String(key);

		if (this.handlers.has(keyStr)) {
			throw new errors.HandlerAlreadyRegisteredError(keyStr);
		}

		this.handlers.set(keyStr, {
			executor,
			...options,
		});
	}

	async execute<
		K extends keyof C,
		TArgs extends ExecuteArgs<C, K, TPreHandlerKey>,
	>(
		key: K,
		payload: ExtractPayload<C, K>,
		...args: TArgs
	): Promise<
		ExecuteResponseByOptions<
			C,
			K,
			TPreHandlerKey,
			TPreHandlerErrorMap,
			ExtractOptionsFromExecuteArgs<TArgs>
		>
	> {
		const executionContext = args[0] ?? {};
		const keyStr = String(key);
		const handlerReg = this.handlers.get(keyStr);

		if (!handlerReg) {
			throw new errors.HandlerNotRegisteredError(keyStr, this.moduleName);
		}

		const applicableMiddlewares: any[] = [];

		// Accumulate context by executing middlewares in order
		let context: AnyContext = {};

		for (const middleware of applicableMiddlewares) {
			const result: unknown = await middleware.execute(
				payload,
				context,
				executionContext,
			);

			// Check if result is an error Result (has ok: false)
			if (
				typeof result === "object" &&
				result !== null &&
				"ok" in result &&
				typeof (result as any).ok === "boolean"
			) {
				if ((result as any).ok === false) {
					// Middleware returned error - short circuit and return
					return result as any;
				}
				// Middleware returned success Result - extract value and merge
				const value = (result as any).value;
				if (typeof value === "object" && value !== null) {
					context = { ...context, ...value };
				}
			} else if (typeof result === "object" && result !== null) {
				// Middleware returned plain data - merge directly
				context = { ...context, ...(result as AnyContext) };
			}
		}

		// All middlewares succeeded - execute handler
		return handlerReg.executor(payload, context) as any;
	}

	unregister<K extends keyof C>(key: K): void {
		this.handlers.delete(String(key));
	}
}
