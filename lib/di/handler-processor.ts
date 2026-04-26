import * as Awilix from "awilix";
import type { AnyContract } from "../mediator/contract.types.js";
import type { Handler } from "../mediator/handler.types.js";
import { Mediator } from "../mediator/mediator.js";
import type { MiddlewareResolverMap } from "../mediator/middleware.types.js";
import * as ERRORS from "./errors.js";
import type { AnyModule as M } from "./module.types.js";
import type { ClassHandler } from "./provider.types.js";
import { getOrCreateRequestScope } from "./request-scope-context.js";
import { isClassHandler } from "./type-guards.js";

export const HandlerType = {
	Query: "query",
	Command: "command",
} as const;

export type HandlerType = (typeof HandlerType)[keyof typeof HandlerType];

export class HandlerProcessor {
	constructor(
		private readonly providerOptions: Partial<Awilix.BuildResolverOptions<any>>,
	) {}

	public processHandlers(
		m: M,
		scope: Awilix.AwilixContainer,
		handlerType: HandlerType,
		middlewareResolvers: MiddlewareResolverMap,
	): void {
		const config = {
			query: {
				prefix: "q",
				handlers: m.queryHandlers,
			},
			command: {
				prefix: "c",
				handlers: m.commandHandlers,
			},
		};

		const { prefix, handlers } = config[handlerType];

		if (!handlers?.length) return;

		const mediator = new Mediator(middlewareResolvers, m.name);

		for (const h of handlers) {
			const handler = isClassHandler(h) ? h : { useClass: h };
			const HandlerClass = handler.useClass;

			const options = this.extractHandlerOptions(m, handler);
			const handlerSymbol = Symbol(`${prefix}-handler_${HandlerClass.name}`);

			scope.register({
				[handlerSymbol]: Awilix.asClass(HandlerClass, options),
			});

			const resolveHandler = (): Handler<AnyContract> => {
				const requestScope =
					options.lifetime === Awilix.Lifetime.SINGLETON
						? scope
						: getOrCreateRequestScope(scope);

				return requestScope.resolve(handlerSymbol);
			};

			const { key } = resolveHandler();

			if (!key)
				throw new ERRORS.HandlerMissingStaticKeyError(HandlerClass.name);

			mediator.register(key, (payload, context) => {
				return resolveHandler().executor(payload, context);
			});
		}

		scope.register({
			[`${handlerType}Mediator`]: Awilix.asValue(mediator),
		});
	}

	private extractHandlerOptions(
		m: M,
		handler: ClassHandler,
	): Awilix.BuildResolverOptions<any> {
		const { useClass: _, ...awilixOptions } = handler;

		return {
			...this.providerOptions,
			...m.providerOptions,
			...awilixOptions,
		};
	}
}
