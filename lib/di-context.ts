import {
	type AwilixContainer,
	asClass,
	asFunction,
	asValue,
	type BuildResolverOptions,
	type ContainerOptions,
	createBuildResolver,
	createContainer,
	Lifetime,
	type Resolver,
} from "awilix";
import type { Handler } from "./cqrs.types.js";
import * as ERRORS from "./di-context.errors.js";
import {
	type AnyProvider,
	type ClassHandler,
	type ControllerConstructor,
	isClassHandler,
	isClassProvider,
	isCostructorProvider,
	isFactoryProvider,
	isForwardRef,
	isPrimitive,
	type AnyModule as M,
} from "./di-context.types.js";
import { ProviderDependencySorter } from "./provider-dependency-sorter.js";

interface DiContextOptions<TFramework = unknown> {
	onQueryHandler?: (resolveHandler: () => Handler<any, string>) => void;
	onCommandHandler?: (resolveHandler: () => Handler<any, string>) => void;
	onController?: (
		ControllerClass: ControllerConstructor<TFramework>,
		scope: AwilixContainer,
	) => void;
	containerOptions?: ContainerOptions;
	rootProviders?: Record<string, Resolver<any>>;
	providerOptions?: Partial<BuildResolverOptions<any>>;
}

export interface ModuleScopeTree<S extends AwilixContainer = AwilixContainer> {
	name: string;
	scope: S;
	importedScopes: Map<string, ModuleScopeTree>;
}

export class DIContext<TFramework = unknown> {
	private readonly registeredControllers = new WeakMap<
		ControllerConstructor<TFramework>,
		M
	>();
	private readonly forwardRefModules = new WeakSet<M>();
	private readonly moduleScopeMap = new WeakMap<M, AwilixContainer>();
	private readonly sorter = new ProviderDependencySorter();
	private readonly options: DiContextOptions<TFramework> &
		Required<Pick<DiContextOptions, "providerOptions" | "rootProviders">> = {
		// TODO: ensure that rootProviders can be singleton throught all app
		rootProviders: {},
		providerOptions: {
			lifetime: Lifetime.SINGLETON,
		},
	};

	constructor(options: DiContextOptions<TFramework> = {}) {
		this.options = {
			...this.options,
			...options,
			providerOptions: {
				...this.options.providerOptions,
				...options.providerOptions,
			},
		};
	}

	registerModule(module: M): ModuleScopeTree {
		const container = createContainer(this.options.containerOptions);
		container.register(this.options.rootProviders);

		return this.registerModuleWithScope(module, container, []);
	}

	private registerModuleWithScope(
		m: M,
		scope: AwilixContainer,
		moduleChain: M[],
	): ModuleScopeTree {
		this.ensureImportedModulesUniqueness(m);
		this.ensureNoProviderNameConflicts(m);
		this.markModuleIfImportsUseForwardRef(m);

		const isCircular = moduleChain.includes(m);

		if (isCircular) {
			this.ensureCircularDependencyHasForwardRef(m, moduleChain);
			const existingScope = this.moduleScopeMap.get(m);

			if (!existingScope) {
				throw new ERRORS.ModuleScopeNotFoundError(m.name);
			}

			return {
				name: m.name,
				scope: existingScope,
				importedScopes: new Map(),
			};
		}

		// Store the scope in the map before processing (for circular references)
		this.moduleScopeMap.set(m, scope);

		const importedModulesWithScope = this.resolveImports(m).map((module) => {
			const container = createContainer(this.options.containerOptions);
			container.register(this.options.rootProviders);

			return {
				...this.registerModuleWithScope(module, container, [...moduleChain, m]),
				module,
			};
		});

		importedModulesWithScope.forEach(
			({ module: importedModule, scope: importedScope }) => {
				Object.entries(importedModule.exports || {}).forEach(
					([key, provider]) => {
						scope.register({
							[key]: this.resolveProvider({
								key,
								provider,
								resolutionScope: importedScope,
								module: importedModule,
								wrapForExport: true,
							}),
						});
					},
				);
			},
		);

		Object.entries(this.sorter.sortByDependencies(m)).forEach(
			([key, provider]) => {
				scope.register({
					[key]: this.resolveProvider({
						key,
						provider,
						resolutionScope: scope,
						module: m,
					}),
				});
			},
		);

		this.processHandlers(m, scope, "query");
		this.processHandlers(m, scope, "command");
		this.processControllers(m, scope);

		return {
			scope,
			importedScopes: this.buildImportedScopesMap(importedModulesWithScope),
			name: m.name,
		};
	}

	private resolveProvider({
		key,
		provider,
		resolutionScope,
		module,
		wrapForExport,
	}: {
		key: string;
		provider: AnyProvider;
		resolutionScope: AwilixContainer;
		module: M;
		wrapForExport?: boolean;
	}): Resolver<any> {
		if (isPrimitive(provider)) {
			return asValue(provider);
		}

		const resolverOptions = this.extractResolverOptions(module, provider);

		if (isCostructorProvider(provider)) {
			const resolver = asClass(provider, resolverOptions);

			return wrapForExport
				? asFunction(() => resolver.resolve(resolutionScope), resolverOptions)
				: resolver;
		}

		if (isFactoryProvider(provider)) {
			const factoryDeps = (provider.inject || []).map((k) => {
				if (!resolutionScope.registrations[k]) {
					throw new ERRORS.ProviderNotFoundError(key, module.name);
				}

				return resolutionScope.registrations[k].resolve(resolutionScope);
			});

			return asFunction(
				() => provider.useFactory(...factoryDeps),
				resolverOptions,
			);
		}

		if (isClassProvider(provider)) {
			const baseResolver = asClass(provider.useClass, resolverOptions);
			const resolver = provider.allowCircular
				? this.createProxyResolver(baseResolver, resolverOptions)
				: baseResolver;

			return wrapForExport
				? asFunction(() => resolver.resolve(resolutionScope), resolverOptions)
				: resolver;
		}

		throw new ERRORS.UnsupportedProviderTypeError(key, module.name);
	}

	private extractResolverOptions(
		module: M,
		provider: AnyProvider | ClassHandler,
		context: "provider" | "handler" = "provider",
	): BuildResolverOptions<any> {
		const baseOptions = {
			...this.options.providerOptions,
			...module.providerOptions,
		};

		if (context === "handler" && isClassHandler(provider)) {
			const { useClass, ...providerOptions } = provider;

			return {
				...baseOptions,
				...providerOptions,
			};
		}

		if (isClassProvider(provider)) {
			const { useClass, allowCircular, ...providerOptions } = provider;

			return {
				...baseOptions,
				...providerOptions,
			};
		}

		if (isFactoryProvider(provider)) {
			const { useClass, ...providerOptions } = isClassProvider(provider.provide)
				? provider.provide
				: {};

			return {
				...baseOptions,
				...providerOptions,
			};
		}

		return baseOptions;
	}

	// https://github.com/jeffijoe/awilix/pull/133#issuecomment-492989852
	private createProxyResolver(
		resolver: Resolver<any>,
		options?: BuildResolverOptions<any>,
	) {
		return createBuildResolver({
			...options,
			resolve(container) {
				let resolved: any = null;

				return new Proxy(
					{},
					{
						get(_, name) {
							if (resolved) {
								return resolved[name];
							}

							resolved = resolver.resolve(container);
							return resolved[name];
						},
					},
				);
			},
		});
	}

	private markModuleIfImportsUseForwardRef(m: M): void {
		if ((m.imports || []).some(isForwardRef)) this.forwardRefModules.add(m);
	}

	private processHandlers(
		m: M,
		scope: AwilixContainer,
		handlerType: "query" | "command",
	) {
		const config = {
			query: {
				prefix: "q",
				handlers: m.queryHandlers,
				onHandler: this.options.onQueryHandler,
			},
			command: {
				prefix: "c",
				handlers: m.commandHandlers,
				onHandler: this.options.onCommandHandler,
			},
		};

		const { prefix, handlers, onHandler } = config[handlerType];

		if (!onHandler || !handlers?.length) return;

		for (const h of handlers) {
			const handler = isClassHandler(h) ? h : { useClass: h };
			const options = this.extractResolverOptions(m, handler, "handler");
			const handlerSymbol = Symbol(
				`${prefix}-handler_${handler.useClass.name}`,
			);

			scope.register({
				[handlerSymbol]: asClass(handler.useClass, options),
			});

			onHandler(() => {
				const requestScope =
					options.lifetime === Lifetime.SINGLETON ? scope : scope.createScope();

				return requestScope.resolve(handlerSymbol);
			});
		}
	}

	private processControllers(m: M, diScope: AwilixContainer) {
		if (!this.options.onController || !m.controllers?.length) return;

		if (new Set(m.controllers).size !== m.controllers.length) {
			throw new ERRORS.DuplicateControllersInModuleError(m.name);
		}

		for (const ControllerClass of m.controllers) {
			const existingModule = this.registeredControllers.get(ControllerClass);

			if (!existingModule) {
				this.registeredControllers.set(ControllerClass, m);
				this.options.onController(ControllerClass, diScope);
				continue;
			}

			// Same module instance imported multiple times - skip silently
			if (existingModule === m) {
				continue;
			}

			// Different module trying to register the same controller - throw error
			throw new ERRORS.ControllerAlreadyRegisteredError(
				ControllerClass.name,
				existingModule.name,
			);
		}
	}

	private ensureCircularDependencyHasForwardRef(m: M, moduleChain: M[]): void {
		const hasForwardRefInCycle =
			this.forwardRefModules.has(m) ||
			moduleChain.some((module) => this.forwardRefModules.has(module));

		if (hasForwardRefInCycle) return;

		const chainNames = moduleChain.map((module) => module.name);
		throw new ERRORS.CircularModuleDependencyError(m.name, chainNames);
	}

	private ensureImportedModulesUniqueness(m: M) {
		const importedNames = new Set<string>();

		for (const imported of this.resolveImports(m)) {
			if (importedNames.has(imported.name)) {
				throw new ERRORS.DuplicateModuleImportError(m.name, imported.name);
			}

			importedNames.add(imported.name);
		}
	}

	private ensureNoProviderNameConflicts(m: M) {
		const moduleProviderKeys = Object.keys(m.providers || {});
		const importedProviderKeys = this.resolveImports(m).flatMap((importItem) =>
			Object.keys(importItem.exports || {}),
		);

		const conflicts = importedProviderKeys.filter((key) =>
			moduleProviderKeys.includes(key),
		);

		if (conflicts.length > 0) {
			throw new ERRORS.ProviderNameConflictError(m.name, conflicts);
		}
	}

	private resolveImports(m: M): M[] {
		return (m.imports || []).map((importItem) =>
			isForwardRef(importItem) ? importItem.resolve() : importItem,
		);
	}

	private buildImportedScopesMap(
		importedModulesWithScope: (ModuleScopeTree & { module: M })[],
	): ModuleScopeTree["importedScopes"] {
		return importedModulesWithScope.reduce((acc, { module, ...rest }) => {
			acc.set(rest.name, rest);

			return acc;
		}, new Map());
	}
}
