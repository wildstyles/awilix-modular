import * as errors from "./cqrs.errors.js";
import type {
	AnyContract,
	AnyContext,
	AreAllTagsAdded,
	AreDependenciesSatisfied,
	EmptyContext,
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

class MediatorBuilder<
	AccumulatedContext extends AnyContext = EmptyContext,
	AddedTags extends keyof MiddlewareTagRegistry = never,
> {
	private middlewares: Middleware[] = [];

	addMiddleware<
		Tag extends Exclude<keyof MiddlewareTagRegistry, AddedTags>,
		Requires extends keyof MiddlewareTagRegistry | never = never,
	>(
		middleware: [Requires] extends [never]
			? MiddlewareConfig<Tag>
			: AreDependenciesSatisfied<AccumulatedContext, Requires> extends true
				? MiddlewareConfig<Tag, Requires>
				: never,
	): MediatorBuilder<AccumulatedContext & MiddlewareTagRegistry[Tag], AddedTags | Tag> {
		const { tag, requires } = middleware;

		const isDuplicate = this.middlewares.some((mw) => mw.tag === tag);

		if (isDuplicate) {
			throw new errors.DuplicateMiddlewareError(tag);
		}

		const hasRequired = this.middlewares.some((mw) => mw.tag === requires);

		if (requires && !hasRequired) {
			throw new errors.MiddlewareRequiresDependencyError(tag, requires);
		}

		this.middlewares.push(middleware as Middleware);

		return this;
	}

	build: AreAllTagsAdded<AddedTags> extends true
		? <C extends AnyContract>() => Mediator<C>
		: never = () => {
		return new Mediator(this.middlewares, mediatorConstructorToken);
	};
}

const mediatorConstructorToken = Symbol("MediatorConstructorToken");

export class Mediator<C extends AnyContract> {
	private handlers = new Map<string, HandlerRegistration>();
	private middlewares: Middleware[];

	constructor(middlewares: Middleware[], token: typeof mediatorConstructorToken) {
		if (token !== mediatorConstructorToken) {
			throw new errors.CannotConstructMediatorDirectly();
		}

		this.middlewares = middlewares;
	}

	static initialize<C extends AnyContract>() {
		return new Mediator<C>([], mediatorConstructorToken);
	}

	static initializeBuilder() {
		return new MediatorBuilder();
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
	): Promise<ExtractResponse<C, K>> {
		const keyStr = String(key);
		const handlerReg = this.handlers.get(keyStr);

		if (!handlerReg) {
			throw new errors.HandlerNotRegisteredError(keyStr);
		}

		const applicableMiddlewares = this.middlewares.filter((mw) =>
			this.shouldApplyMiddleware(mw, handlerReg),
		);

		const wrappedExecutor = applicableMiddlewares.reduceRight<
			Executor<unknown, unknown, AnyContext>
		>(
			(nextExecutor, middleware) => (payload, context) =>
				middleware.execute(payload, context, nextExecutor),
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
