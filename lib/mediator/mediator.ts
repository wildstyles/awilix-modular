import { Result, type Result as ResultType } from "../result/result.js";
import * as errors from "./errors.js";
import type { AnyContract, Executor, ExtractPayload } from "./handler.types.js";
import type {
	ExecutePreHandlerOptions,
	ExecuteResponse,
	ExecuteRuntimeOptions,
	MiddlewareResolver,
	MiddlewareResolverMap,
} from "./mediator.types.js";
import type { AnyContext, ExecutionContext } from "./middleware.types.js";

export class Mediator<
	C extends AnyContract,
	TPreHandlerKey extends string = never,
	TPreHandlerErrorMap extends Record<string, unknown> = Record<never, never>,
> {
	private handlers = new Map<string, Executor>();
	private middlewareResolvers: MiddlewareResolverMap;
	private moduleName: string;

	constructor(middlewareResolvers: MiddlewareResolverMap, moduleName: string) {
		this.moduleName = moduleName;
		this.middlewareResolvers = middlewareResolvers;
	}

	register(key: string, executor: Executor): void {
		const keyStr = String(key);

		if (this.handlers.has(keyStr)) {
			throw new errors.HandlerAlreadyRegisteredError(keyStr);
		}

		this.handlers.set(keyStr, executor);
	}

	async execute<
		K extends keyof C,
		TOptions extends ExecuteRuntimeOptions<
			C,
			K,
			TPreHandlerKey
		> = ExecuteRuntimeOptions<C, K, TPreHandlerKey>,
	>(
		key: K,
		payload: ExtractPayload<C, K>,
		options?: TOptions,
	): Promise<
		ExecuteResponse<C, K, TPreHandlerKey, TPreHandlerErrorMap, TOptions>
	> {
		type Response = ExecuteResponse<
			C,
			K,
			TPreHandlerKey,
			TPreHandlerErrorMap,
			TOptions
		>;

		const keyStr = String(key);
		const executor = this.handlers.get(keyStr);

		if (!executor) {
			throw new errors.HandlerNotRegisteredError(keyStr, this.moduleName);
		}

		const { executionContext, includePreHandlers, excludePreHandlers } =
			options ?? {};

		const applicableMiddlewares = this.filterMiddlewareResolvers({
			excludePreHandlers,
			includePreHandlers,
		});

		const middlewareResult = await this.executeMiddlewares(
			applicableMiddlewares,
			payload,
			executionContext ?? {},
		);

		if (middlewareResult.type === "error") {
			return middlewareResult.error as Response;
		}

		const handlerResult = await executor(payload, middlewareResult.context);

		if (middlewareResult.hasResultMiddleware) {
			return (
				this.isResult(handlerResult) ? handlerResult : Result.ok(handlerResult)
			) as Response;
		}

		return handlerResult as Response;
	}

	private async executeMiddlewares(
		middlewares: Array<[string, MiddlewareResolver]>,
		payload: unknown,
		executionContext: ExecutionContext,
	): Promise<
		| { type: "success"; context: AnyContext; hasResultMiddleware: boolean }
		| { type: "error"; error: ResultType<never, unknown> }
	> {
		let context: AnyContext = {};
		let hasResultMiddleware = false;

		for (const [middlewareKey, resolver] of middlewares) {
			const result = await resolver().execute(
				payload,
				context,
				executionContext,
			);

			if (this.isResult(result)) {
				hasResultMiddleware = true;
			}

			const processed = this.processMiddlewareResult(
				result,
				context,
				middlewareKey,
			);

			if (processed.shouldShortCircuit) {
				return { type: "error", error: processed.result };
			}

			context = processed.context;
		}

		return { type: "success", context, hasResultMiddleware };
	}

	private processMiddlewareResult(
		result: unknown,
		currentContext: AnyContext,
		middlewareKey: string,
	):
		| { shouldShortCircuit: true; result: ResultType<never, unknown> }
		| { shouldShortCircuit: false; context: AnyContext } {
		if (this.isResult(result)) {
			return result.ok
				? {
						shouldShortCircuit: false,
						context: this.mergeContext(
							currentContext,
							result.value,
							middlewareKey,
						),
					}
				: { shouldShortCircuit: true, result };
		}

		return {
			shouldShortCircuit: false,
			context: this.mergeContext(currentContext, result, middlewareKey),
		};
	}

	private filterMiddlewareResolvers(
		options?: ExecutePreHandlerOptions,
	): Array<[string, MiddlewareResolver]> {
		const { includePreHandlers = [], excludePreHandlers = [] } = options ?? {};

		return Array.from(this.middlewareResolvers.entries()).filter(([key]) => {
			if (excludePreHandlers.includes(key)) {
				return false;
			}

			if (includePreHandlers.length > 0) {
				return includePreHandlers.includes(key);
			}

			return true;
		});
	}

	private mergeContext(
		currentContext: AnyContext,
		data: unknown,
		middlewareKey: string,
	): AnyContext {
		if (data === undefined) {
			return currentContext;
		}

		if (typeof data !== "object" || data === null) {
			const returnedType = data === null ? "null" : typeof data;
			throw new errors.InvalidMiddlewareReturnValueError(
				middlewareKey,
				returnedType,
			);
		}

		// Check for key conflicts
		const currentKeys = Object.keys(currentContext);
		const newKeys = Object.keys(data);
		const conflictingKeys = newKeys.filter((key) =>
			currentKeys.includes(key),
		);

		if (conflictingKeys.length > 0) {
			throw new errors.ContextKeyConflictError(middlewareKey, conflictingKeys);
		}

		return { ...currentContext, ...data };
	}

	private isResult(value: unknown): value is ResultType<unknown, unknown> {
		return (
			typeof value === "object" &&
			value !== null &&
			"ok" in value &&
			typeof value.ok === "boolean"
		);
	}
}
