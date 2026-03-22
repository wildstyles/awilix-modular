import {
	type AwilixContainer,
	asClass,
	type BuildResolverOptions,
	Lifetime,
} from "awilix";
import type { HttpVerb } from "./decorators/http-verbs.js";
import {
	type IRouteState,
	type IState,
	type MethodName,
	STATE,
} from "./decorators/state-util.js";
import * as ERRORS from "./di-context.errors.js";
import type {
	Controller,
	ControllerConstructor,
	AnyModule as M,
} from "./di-context.types.js";
import { isClassController } from "./di-context.types.js";
import {
	type ExpressFramework,
	type ExpressMethod,
	type FastifyFramework,
	HttpFramework,
} from "./framework.types.js";

type RouteRegistrationParams = {
	verb: HttpVerb;
	path: string;
	handler: any;
	preHandler: any[];
};

export class ControllerProcessor {
	private readonly registeredControllers = new WeakMap<
		ControllerConstructor<unknown>,
		M
	>();
	private readonly frameworkType: HttpFramework;
	private readonly routeRegistrationFn: Record<
		HttpFramework,
		(params: RouteRegistrationParams) => void
	> = {
		[HttpFramework.FASTIFY]: this.registerFastifyRoute.bind(this),
		[HttpFramework.EXPRESS]: this.registerExpressRoute.bind(this),
		[HttpFramework.UNKNOWN]: () => {
			throw new ERRORS.UnsupportedFrameworkError();
		},
	};

	constructor(
		private readonly framework: unknown,
		private readonly providerOptions: Partial<BuildResolverOptions<any>>,
	) {
		this.frameworkType = this.detectFramework();
	}

	public processControllers(m: M, diScope: AwilixContainer): void {
		if (!m.controllers?.length) return;

		if (new Set(m.controllers).size !== m.controllers.length) {
			throw new ERRORS.DuplicateControllersInModuleError(m.name);
		}

		for (const c of m.controllers) {
			const { useClass, ...awilixOptions } = isClassController(c)
				? c
				: { useClass: c };
			const existingModule = this.registeredControllers.get(useClass);

			if (!existingModule) {
				this.registeredControllers.set(useClass, m);

				const controllerSymbol = Symbol(`controller_${useClass.name}`);
				const options = {
					...this.providerOptions,
					...m.providerOptions,
					...awilixOptions,
				};
				const isWithNewScope = options.lifetime !== Lifetime.SINGLETON;

				diScope.register({
					[controllerSymbol]: asClass(useClass, {
						...options,
						...(isWithNewScope && {
							injector: () => ({
								resolveSelf: () =>
									this.resolveBySymbol(
										controllerSymbol,
										diScope,
										isWithNewScope,
									),
							}),
						}),
					}),
				});

				const controllerInstance = this.resolveBySymbol(
					controllerSymbol,
					diScope,
					false,
				);

				if (controllerInstance.registerRoutes) {
					controllerInstance.registerRoutes(this.framework);
				}

				this.processDecoratedController(useClass, () =>
					this.resolveBySymbol(controllerSymbol, diScope, isWithNewScope),
				);

				continue;
			}

			// Same module instance imported multiple times - skip silently
			if (existingModule === m) {
				continue;
			}

			// Different module trying to register the same controller - throw error
			throw new ERRORS.ControllerAlreadyRegisteredError(
				useClass.name,
				existingModule.name,
			);
		}
	}

	private resolveBySymbol(
		symbol: symbol,
		scope: AwilixContainer,
		withNewScope: boolean,
	): Controller<unknown> {
		if (withNewScope) return scope.createScope().resolve(symbol);

		return scope.resolve(symbol);
	}

	private processDecoratedController(
		target: ControllerConstructor,
		resolve: () => Controller<unknown>,
	) {
		const state = this.getDecoratedState(target);

		if (!state) return;

		this.rollUpDecoratedState(state).forEach((routeState, methodName) => {
			this.registerRoute(methodName, routeState, resolve);
		});
	}

	private registerRoute(
		methodName: MethodName,
		routeState: IRouteState,
		resolve: () => any,
	) {
		routeState.verbs.forEach((verb) => {
			routeState.paths.forEach((path) => {
				const handler = async (request: any, reply: any) => {
					return resolve()[methodName](request, reply);
				};

				this.routeRegistrationFn[this.frameworkType]({
					verb,
					path,
					handler,
					preHandler: routeState.beforeMiddleware,
				});
			});
		});
	}

	private getDecoratedState(target: ControllerConstructor): IState | undefined {
		const symbol = Object.getOwnPropertySymbols(target).find(
			(s) => s.toString() === "Symbol(Symbol.metadata)",
		);

		if (!symbol) return;

		return (target as any)[symbol][STATE];
	}

	private rollUpDecoratedState(state: IState): IState["methods"] {
		const result: IState["methods"] = new Map();

		state.methods.forEach((method, key) => {
			result.set(key, {
				paths: this.concatPaths(state.root.paths, method.paths),
				beforeMiddleware: [
					...state.root.beforeMiddleware,
					...method.beforeMiddleware,
				],
				afterMiddleware: [
					...method.afterMiddleware,
					...state.root.afterMiddleware,
				],
				verbs: method.verbs,
			});
		});

		return result;
	}

	private registerFastifyRoute(params: RouteRegistrationParams) {
		(this.framework as FastifyFramework).route({
			method: params.verb,
			url: params.path,
			handler: params.handler,
			preHandler: params.preHandler,
		});
	}

	private registerExpressRoute(params: RouteRegistrationParams) {
		const method = params.verb.toLowerCase() as ExpressMethod;

		const handlers = [...params.preHandler];

		// Wrap handler to auto-send response if value is returned
		handlers.push(async (req: any, res: any, next: any) => {
			try {
				const result = await params.handler(req, res);
				if (result !== undefined && !res.headersSent) {
					res.send(result);
				}
			} catch (error) {
				next(error);
			}
		});

		(this.framework as ExpressFramework)[method](params.path, ...handlers);
	}

	private concatPaths(rootPaths: string[], methodPaths: string[]): string[] {
		if (rootPaths.length === 0) {
			return [...methodPaths];
		}

		const result: Array<string> = [];
		rootPaths.forEach((rootPath) => {
			if (methodPaths.length === 0) {
				result.push(rootPath);
			} else {
				methodPaths.forEach((methodPath) => {
					result.push(rootPath + methodPath);
				});
			}
		});

		return result;
	}

	private detectFramework(): HttpFramework {
		if (this.isFastifyFramework()) {
			return HttpFramework.FASTIFY;
		}

		if (this.isExpressFramework()) {
			return HttpFramework.EXPRESS;
		}

		return HttpFramework.UNKNOWN;
	}

	private isFastifyFramework(): boolean {
		return Object.getOwnPropertySymbols(this.framework).some((key) =>
			key.toString().includes("fastify"),
		);
	}

	private isExpressFramework(): boolean {
		const framework: any = this.framework;

		return (
			typeof framework === "function" &&
			typeof framework.use === "function" &&
			typeof framework.get === "function" &&
			typeof framework.set === "function"
		);
	}
}
