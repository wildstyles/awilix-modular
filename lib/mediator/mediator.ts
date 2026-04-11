import * as errors from "./errors.js";
import type {
	AnyContract,
	Executor,
	ExtractPayload,
	ExtractResponse,
} from "./handler.types.js";
import type {
	AnyContext,
	ExecutionContext,
	Middleware,
	MiddlewareTagRegistry,
} from "./middleware.types.js";

type HandlerMiddlewareOptions = {
	middlewareTags?: readonly (keyof MiddlewareTagRegistry)[];
	excludeMiddlewareTags?: readonly (keyof MiddlewareTagRegistry)[];
};

interface HandlerRegistration extends HandlerMiddlewareOptions {
	executor: Executor;
}

export class Mediator<C extends AnyContract> {
	private handlers = new Map<string, HandlerRegistration>();
	private middlewares: Middleware[];
	private moduleName: string;

	constructor(middlewares: Middleware[], moduleName: string) {
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

		this.ensureMiddlewareDepsSatisfied(keyStr, options);

		this.handlers.set(keyStr, {
			executor,
			...options,
		});
	}

	execute<K extends keyof C>(
		key: K,
		payload: ExtractPayload<C, K>,
		...args: keyof ExecutionContext extends never
			? [executionContext?: AnyContext]
			: [executionContext: ExecutionContext]
	): Promise<ExtractResponse<C, K>> {
		const executionContext = args[0] ?? {};
		const keyStr = String(key);
		const handlerReg = this.handlers.get(keyStr);

		if (!handlerReg) {
			throw new errors.HandlerNotRegisteredError(keyStr, this.moduleName);
		}

		const applicableMiddlewares = this.middlewares.filter((mw) =>
			this.shouldApplyMiddleware(mw, handlerReg),
		);

		// Middlewares receive executionContext, but handlers (final executor) do not
		const wrappedExecutor = applicableMiddlewares.reduceRight<
			Executor<unknown, unknown, AnyContext>
		>(
			(nextExecutor, middleware) => (payload, context) =>
				middleware.execute(payload, context, executionContext, nextExecutor),
			handlerReg.executor,
		);

		return wrappedExecutor(payload, {});
	}

	unregister<K extends keyof C>(key: K): void {
		this.handlers.delete(String(key));
	}

	private ensureMiddlewareDepsSatisfied(
		handlerKey: string,
		options?: HandlerMiddlewareOptions,
	): void {
		const middlewareTags =
			options?.middlewareTags || this.middlewares.map((el) => el.tag);
		const excludedTags = options?.excludeMiddlewareTags || [];

		const effectiveMiddlewares = this.middlewares.filter(
			(m) => !excludedTags.includes(m.tag) && middlewareTags.includes(m.tag),
		);
		const effectiveTags = effectiveMiddlewares.map((m) => m.tag);

		effectiveMiddlewares.forEach((middleware) => {
			if (
				middleware?.requires &&
				!effectiveTags.includes(middleware.requires)
			) {
				throw new errors.MiddlewareDependencyNotSatisfiedError(
					handlerKey,
					String(middleware.tag),
					middleware.requires,
				);
			}
		});
	}

	private shouldApplyMiddleware(
		middleware: Middleware,
		handler: HandlerRegistration,
	): boolean {
		const { middlewareTags = [], excludeMiddlewareTags = [] } = handler;
		const middlewareTag = middleware.tag;

		if (excludeMiddlewareTags.includes(middlewareTag)) {
			return false;
		}

		if (middlewareTags.length > 0) {
			return middlewareTags.includes(middlewareTag);
		}

		return true;
	}
}
