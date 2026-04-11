import * as errors from "./errors.js";
import type { AnyContract } from "./handler.types.js";
import { Mediator } from "./mediator.js";
import type {
	AnyContext,
	AreAllTagsAdded,
	AreDependenciesSatisfied,
	EmptyContext,
	Middleware,
	MiddlewareConfig,
	MiddlewareTagRegistry,
} from "./middleware.types.js";

export interface CompleteMediatorBuilder {
	__buildForModule(moduleName: string): Mediator<AnyContract>;
}

export class MediatorBuilder<
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
	): MediatorBuilder<
		AccumulatedContext & MiddlewareTagRegistry[Tag],
		AddedTags | Tag
	> {
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
		? () => CompleteMediatorBuilder
		: never = () => {
		return {
			__buildForModule: (moduleName) => {
				return new Mediator(this.middlewares, moduleName);
			},
		};
	};
}
