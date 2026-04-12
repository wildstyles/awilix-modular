import * as Awilix from "awilix";
import { Mediator } from "../mediator/mediator.js";
import * as ERRORS from "./errors.js";
import type { AnyModule as M } from "./module.types.js";
import type { ClassHandler } from "./provider.types.js";

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
	): void {
		const config = {
			query: {
				prefix: "q",
				handlers: m.queryHandlers,
				mediator: new Mediator([], m.name),
			},
			command: {
				prefix: "c",
				handlers: m.commandHandlers,
				mediator: new Mediator([], m.name),
			},
		};

		const { prefix, handlers, mediator } = config[handlerType];

		if (!handlers?.length) return;

		// for (const h of handlers) {
		// 	if (!mediator) {
		// 		throw new ERRORS.MediatorIsNotProvided(handlerType);
		// 	}
		//
		// 	const handler = isClassHandler(h) ? h : { useClass: h };
		// 	const HandlerClass = handler.useClass;
		//
		// 	this.ensureRequiredStaticPropertyExistance(HandlerClass);
		//
		// 	const options = this.extractHandlerOptions(m, handler);
		// 	const handlerSymbol = Symbol(`${prefix}-handler_${HandlerClass.name}`);
		//
		// 	scope.register({
		// 		[handlerSymbol]: Awilix.asClass(HandlerClass, options),
		// 	});
		//
		// 	const resolveHandler = (): Handler<AnyContract> => {
		// 		const requestScope =
		// 			options.lifetime === Awilix.Lifetime.SINGLETON
		// 				? scope
		// 				: scope.createScope();
		//
		// 		return requestScope.resolve(handlerSymbol);
		// 	};
		//
		// 	mediator.register(HandlerClass.key, (payload, context) => {
		// 		return resolveHandler().executor(payload, context);
		// 	});
		// }

		scope.register({
			[`${handlerType}Mediator`]: Awilix.asValue(mediator),
		});
	}

	private ensureRequiredStaticPropertyExistance(HandlerClass: any): void {
		if (!("key" in HandlerClass) || typeof HandlerClass.key !== "string") {
			throw new ERRORS.HandlerMissingStaticKeyError(HandlerClass.name);
		}
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

	private processMiddlewares(
		m: M,
		scope: Awilix.AwilixContainer,
		preHandlers: readonly any[],
	): any[] {
		return [];
	}
}
