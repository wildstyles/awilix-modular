import {
	type AwilixContainer,
	asClass,
	asValue,
	type BuildResolverOptions,
	Lifetime,
} from "awilix";
import type { AnyContract, Handler } from "../mediator/mediator.types.js";
import * as ERRORS from "./di-context.errors.js";
import type { DiContextOptions } from "./di-context.js";
import type { ClassHandler, AnyModule as M } from "./di-context.types.js";
import { isClassHandler } from "./di-context.types.js";

export const HandlerType = {
	Query: "query",
	Command: "command",
} as const;

export type HandlerType = (typeof HandlerType)[keyof typeof HandlerType];

export class HandlerProcessor {
	constructor(
		private readonly providerOptions: Partial<BuildResolverOptions<any>>,
		private readonly queryMediatorBuilder: DiContextOptions["queryMediatorBuilder"],
		private readonly commandMediatorBuilder: DiContextOptions["commandMediatorBuilder"],
	) {}

	public processHandlers(
		m: M,
		scope: AwilixContainer,
		handlerType: HandlerType,
	): void {
		const config = {
			query: {
				prefix: "q",
				handlers: m.queryHandlers,
				mediator: this.queryMediatorBuilder?.__buildForModule(m.name),
			},
			command: {
				prefix: "c",
				handlers: m.commandHandlers,
				mediator: this.commandMediatorBuilder?.__buildForModule(m.name),
			},
		};

		const { prefix, handlers, mediator } = config[handlerType];

		if (!handlers?.length) return;

		for (const h of handlers) {
			if (!mediator) {
				throw new ERRORS.MediatorIsNotProvided(handlerType);
			}

			const handler = isClassHandler(h) ? h : { useClass: h };
			const HandlerClass = handler.useClass;

			this.ensureRequiredStaticPropertyExistance(HandlerClass);

			const options = this.extractHandlerOptions(m, handler);
			const handlerSymbol = Symbol(`${prefix}-handler_${HandlerClass.name}`);

			scope.register({
				[handlerSymbol]: asClass(HandlerClass, options),
			});

			const resolveHandler = (): Handler<AnyContract> => {
				const requestScope =
					options.lifetime === Lifetime.SINGLETON ? scope : scope.createScope();

				return requestScope.resolve(handlerSymbol);
			};

			const handlerInstance = resolveHandler();

			mediator.register(
				HandlerClass.key,
				(payload, context) => {
					return resolveHandler().executor(payload, context);
				},
				{
					middlewareTags: handlerInstance.middlewareTags,
					excludeMiddlewareTags: handlerInstance.excludeMiddlewareTags,
				},
			);
		}

		scope.register({
			[`${handlerType}Mediator`]: asValue(mediator),
		});
	}

	private ensureRequiredStaticPropertyExistance(HandlerClass: any): void {
		if (!("key" in HandlerClass) || typeof HandlerClass.key !== "string") {
			throw new ERRORS.HandlerMissingStaticKeyError(HandlerClass.name);
		}

		if (!("contract" in HandlerClass)) {
			throw new ERRORS.HandlerMissingStaticContractError(HandlerClass.name);
		}
	}

	private extractHandlerOptions(
		m: M,
		handler: ClassHandler,
	): BuildResolverOptions<any> {
		const { useClass: _, ...awilixOptions } = handler;

		return {
			...this.providerOptions,
			...m.providerOptions,
			...awilixOptions,
		};
	}
}
