import * as errors from "./cqrs.errors.js";
import type {
	AnyContract,
	AnyMeta,
	AreDependenciesSatisfied,
	EmptyMeta,
	Executor,
	ExtractPayload,
	ExtractResponse,
	Middleware,
	MiddlewareConfig,
	MiddlewareTagRegistry,
} from "./cqrs.types.js";

type HandlerMiddlewareOptions = {
	middlewareTags?: readonly (keyof MiddlewareTagRegistry)[];
	excludeMiddlewareTags?: readonly (keyof MiddlewareTagRegistry)[];
};

interface HandlerRegistration extends HandlerMiddlewareOptions {
	executor: Executor;
}

type AreAllTagsAdded<AddedTags extends keyof MiddlewareTagRegistry> =
	Exclude<keyof MiddlewareTagRegistry, AddedTags> extends never ? true : false;

// Bus - used after build() is called (exposes all methods)
export interface Bus<C extends AnyContract> {
	register(
		key: string,
		executor: Executor,
		options?: HandlerMiddlewareOptions,
	): void;
	execute<K extends keyof C>(
		key: K,
		payload: ExtractPayload<C, K>,
	): Promise<ExtractResponse<C, K>>;
	unregister<K extends keyof C>(key: K): void;
}

// BusBuilder - used during configuration (only exposes addMiddleware and build)
export interface BusBuilder<
	C extends AnyContract,
	AccumulatedMeta extends AnyMeta = EmptyMeta,
	AddedTags extends keyof MiddlewareTagRegistry = never,
> {
	addMiddleware<
		Tag extends Exclude<keyof MiddlewareTagRegistry, AddedTags>,
		Requires extends keyof MiddlewareTagRegistry | never = never,
	>(
		middleware: [Requires] extends [never]
			? MiddlewareConfig<Tag>
			: AreDependenciesSatisfied<AccumulatedMeta, Requires> extends true
				? MiddlewareConfig<Tag, Requires>
				: never,
	): BusBuilder<
		C,
		AccumulatedMeta & MiddlewareTagRegistry[Tag],
		AddedTags | Tag
	>;
	build: AreAllTagsAdded<AddedTags> extends true ? () => Bus<C> : never;
}

export function initializeBus<C extends AnyContract>(): BusBuilder<
	C,
	EmptyMeta,
	never
> {
	const handlers = new Map<string, HandlerRegistration>();
	const middlewares: Middleware[] = [];

	const keyToString = <K extends keyof C>(key: K): string => String(key);

	function ensureMiddlewareDepsSatisfied(
		handlerKey: string,
		options?: HandlerMiddlewareOptions,
	): void {
		const middlewareTags =
			options?.middlewareTags || middlewares.map((el) => el.tag);
		const excludedTags = options?.excludeMiddlewareTags || [];

		// Determine which middlewares will actually run
		const effectiveMiddlewares = middlewares.filter(
			(m) => !excludedTags.includes(m.tag) && middlewareTags.includes(m.tag),
		);
		const effectiveTags = effectiveMiddlewares.map((m) => m.tag);

		// Check each effective middleware for dependency satisfaction
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

	function register(
		key: string,
		executor: Executor,
		options?: HandlerMiddlewareOptions,
	): void {
		const keyStr = keyToString(key);

		if (handlers.has(keyStr)) {
			throw new errors.HandlerAlreadyRegisteredError(keyStr);
		}

		ensureMiddlewareDepsSatisfied(keyStr, options);

		handlers.set(keyStr, {
			executor,
			...options,
		});
	}

	function shouldApplyMiddleware(
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

	function execute<K extends keyof C>(
		key: K,
		payload: ExtractPayload<C, K>,
	): Promise<ExtractResponse<C, K>> {
		const keyStr = keyToString(key);
		const handlerReg = handlers.get(keyStr);

		if (!handlerReg) {
			throw new errors.HandlerNotRegisteredError(keyStr);
		}

		const applicableMiddlewares = middlewares.filter((mw) =>
			shouldApplyMiddleware(mw, handlerReg),
		);

		const wrappedExecutor = applicableMiddlewares.reduceRight<
			Executor<unknown, unknown, AnyMeta>
		>(
			(nextExecutor, middleware) => (payload, meta) =>
				middleware.execute(payload, meta, nextExecutor),
			handlerReg.executor,
		);

		return wrappedExecutor(payload, {});
	}

	function unregister<K extends keyof C>(key: K): void {
		handlers.delete(keyToString(key));
	}

	function addMiddleware(middleware: Middleware): any {
		const { tag, requires } = middleware;

		const isDuplicate = middlewares.some((mw) => mw.tag === tag);

		if (isDuplicate) {
			throw new errors.DuplicateMiddlewareError(tag);
		}

		const hasRequired = middlewares.some((mw) => mw.tag === requires);

		if (requires && !hasRequired) {
			throw new errors.MiddlewareRequiresDependencyError(tag, requires);
		}

		middlewares.push(middleware);

		return builder;
	}

	function build(): any {
		return completeBus;
	}

	const completeBus: any = {
		register,
		unregister,
		execute,
	};

	const builder: any = {
		addMiddleware,
		build,
	};

	return builder;
}
