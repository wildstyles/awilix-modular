import * as Awilix from "awilix";
import type { MiddlewareResolverMap } from "lib/mediator/middleware.types.js";
import type { RouteRegistration } from "../http/openapi-builder.js";
import { ControllerProcessor } from "./controller-processor.js";
import * as ERRORS from "./errors.js";
import { HandlerProcessor } from "./handler-processor.js";
import type { AnyModule as M } from "./module.types.js";
import type { AnyMiddleware, AnyProvider } from "./provider.types.js";
import { ProviderDependencySorter } from "./provider-dependency-sorter.js";
import {
	getOrCreateRequestScope,
	resolveFromRequestScope,
} from "./request-scope-context.js";
import * as GUARGS from "./type-guards.js";

export interface DiContextOptions {
	framework: unknown;
	beforeRouteRegistered?: (params: RouteRegistration) => any[];
	containerOptions?: Awilix.ContainerOptions;
	rootProviders?: Record<string, AnyProvider>;
	providerOptions?: Partial<Awilix.BuildResolverOptions<any>>;
	globalModules?: readonly M[];
}

export interface ModuleScopeTree<
	S extends Awilix.AwilixContainer = Awilix.AwilixContainer,
> {
	name: string;
	scope: S;
	importedScopes: Map<string, ModuleScopeTree>;
}

const ROOT_PROVIDERS_RESOLVER_MAP_SYMBOL = Symbol("rootProvidersResolverMap");

export class DIContext {
	private readonly forwardRefModules = new WeakSet<M>();
	private readonly moduleScopeMap = new WeakMap<M, Awilix.AwilixContainer>();
	private readonly sorter = new ProviderDependencySorter();
	private readonly controllerProcessor: ControllerProcessor;
	private readonly handlerProcessor: HandlerProcessor;
	private readonly options: DiContextOptions;
	private readonly rootContainer: Awilix.AwilixContainer;
	private globalModulesWithScope: (ModuleScopeTree & { module: M })[] = [];

	private constructor(options: DiContextOptions) {
		this.options = {
			...options,
			containerOptions: {
				strict: true,
				injectionMode: Awilix.InjectionMode.CLASSIC,
				...options.containerOptions,
			},
			providerOptions: {
				lifetime: Awilix.Lifetime.SINGLETON,
				...options.providerOptions,
			},
		};

		this.controllerProcessor = new ControllerProcessor(
			this.options.framework,
			this.options.providerOptions || {},
			this.options.beforeRouteRegistered,
		);
		this.handlerProcessor = new HandlerProcessor(
			this.options.providerOptions || {},
		);

		this.rootContainer = Awilix.createContainer(this.options.containerOptions);
		this.initializeRootProviders();
	}

	static create(module: M, options: DiContextOptions): ModuleScopeTree {
		const context = new DIContext(options);
		context.initializeGlobalModules();

		return context.registerModuleWithScope(
			module,
			context.createContainerWithRootProviders(),
			[],
		);
	}

	private createContainerWithRootProviders(): Awilix.AwilixContainer {
		const container = Awilix.createContainer(this.options.containerOptions);
		container.register(
			this.rootContainer.resolve(ROOT_PROVIDERS_RESOLVER_MAP_SYMBOL) as Record<
				string,
				Awilix.Resolver<any>
			>,
		);

		return container;
	}

	private initializeRootProviders(): void {
		const rootProvidersModule: M = {
			name: "RootProvidersModule",
			providers: this.options.rootProviders || {},
		};

		Object.entries(this.sorter.sortByDependencies(rootProvidersModule)).forEach(
			([key, provider]) => {
				this.rootContainer.register({
					[key]: this.resolveProvider({
						provider,
						resolutionScope: this.rootContainer,
						module: rootProvidersModule,
					}),
				});
			},
		);

		const wrappedResolvers = Object.entries(
			rootProvidersModule.providers || {},
		).reduce<Record<string, Awilix.Resolver<any>>>((acc, [key, provider]) => {
			acc[key] = Awilix.asFunction(
				() => this.rootContainer.resolve(key),
				this.extractResolverOptions(rootProvidersModule, provider),
			);

			return acc;
		}, {});

		this.rootContainer.register({
			[ROOT_PROVIDERS_RESOLVER_MAP_SYMBOL]: Awilix.asValue(wrappedResolvers),
		});
	}

	private registerModuleWithScope(
		m: M,
		scope: Awilix.AwilixContainer,
		moduleChain: M[],
		includeGlobalModules = true,
	): ModuleScopeTree {
		this.ensureImportedModulesUniqueness(m, includeGlobalModules);
		this.ensureNoProviderNameConflicts(m, includeGlobalModules);
		this.markModuleIfImportsUseForwardRef(m);

		const isCircular = moduleChain.includes(m);

		if (isCircular) {
			this.ensureCircularDependencyHasForwardRef(m, moduleChain);

			return {
				name: m.name,
				// biome-ignore lint/style/noNonNullAssertion: circular module was already registered at line 158
				scope: this.moduleScopeMap.get(m)!,
				importedScopes: new Map(),
			};
		}

		// Store the scope in the map before processing (for circular references)
		this.moduleScopeMap.set(m, scope);

		const importedModulesWithScope = [
			...(includeGlobalModules ? this.globalModulesWithScope : []),
			...this.resolveImports(m).map((module) => ({
				...this.registerModuleWithScope(
					module,
					this.createContainerWithRootProviders(),
					[...moduleChain, m],
					includeGlobalModules,
				),
				module,
			})),
		];

		importedModulesWithScope.forEach(
			({ module: importedModule, scope: importedScope }) => {
				Object.entries(importedModule.exports || {}).forEach(
					([key, provider]) => {
						scope.register({
							[key]: this.resolveProvider({
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

		const moduleForSorting: M = {
			...m,
			imports: importedModulesWithScope.map((el) => el.module),
		};

		Object.entries(this.sorter.sortByDependencies(moduleForSorting)).forEach(
			([key, provider]) => {
				scope.register({
					[key]: this.resolveProvider({
						provider,
						resolutionScope: scope,
						module: m,
					}),
				});
			},
		);

		// Register and resolve middlewares
		const queryMiddlewareResolvers = this.registerAndBuildMiddlewareResolvers(
			m,
			scope,
			importedModulesWithScope,
			"query",
		);
		const commandMiddlewareResolvers = this.registerAndBuildMiddlewareResolvers(
			m,
			scope,
			importedModulesWithScope,
			"command",
		);

		this.handlerProcessor.processHandlers(
			m,
			scope,
			"query",
			queryMiddlewareResolvers,
		);
		this.handlerProcessor.processHandlers(
			m,
			scope,
			"command",
			commandMiddlewareResolvers,
		);
		this.controllerProcessor.processControllers(m, scope);

		return {
			scope,
			importedScopes: this.buildImportedScopesMap(importedModulesWithScope),
			name: m.name,
		};
	}

	private initializeGlobalModules(): void {
		const globalModules = this.options.globalModules || [];
		const globalModuleNames = new Set<string>();

		for (const globalModule of globalModules) {
			if (globalModuleNames.has(globalModule.name)) {
				throw new ERRORS.DuplicateModuleImportError(
					"globalModules",
					globalModule.name,
				);
			}
			if ((globalModule.imports || []).length > 0) {
				throw new ERRORS.GlobalModuleImportsNotAllowedError(globalModule.name);
			}

			globalModuleNames.add(globalModule.name);
		}

		this.globalModulesWithScope = globalModules.map((module) => ({
			...this.registerModuleWithScope(
				module,
				this.createContainerWithRootProviders(),
				[],
				false,
			),
			module,
		}));
	}

	private registerAndBuildMiddlewareResolvers(
		m: M,
		scope: Awilix.AwilixContainer,
		importedModulesWithScope: (ModuleScopeTree & { module: M })[],
		handlerType: "query" | "command",
	): MiddlewareResolverMap {
		const keyMap = {
			query: {
				preHandlersKey: "queryPreHandlers" as const,
				preHandlerExportsKey: "queryPreHandlerExports" as const,
			},
			command: {
				preHandlersKey: "commandPreHandlers" as const,
				preHandlerExportsKey: "commandPreHandlerExports" as const,
			},
		};

		const { preHandlersKey, preHandlerExportsKey } = keyMap[handlerType];
		const resolverMap: MiddlewareResolverMap = new Map();
		const ownerByKey = new Map<string, string>();

		for (const {
			module: importedModule,
			scope: importedScope,
		} of importedModulesWithScope) {
			for (const [key, middleware] of Object.entries(
				importedModule[preHandlerExportsKey] ?? {},
			)) {
				if (resolverMap.has(key)) {
					throw new ERRORS.MiddlewareNameConflictError(
						m.name,
						key,
						ownerByKey.get(key) ?? importedModule.name,
						handlerType,
					);
				}

				const symbol = Symbol(
					`prehandler_export_${importedModule.name}_${key}`,
				);

				scope.register({
					[symbol]: this.resolveProvider({
						provider: middleware,
						resolutionScope: importedScope,
						module: importedModule,
						wrapForExport: true,
					}),
				});

				resolverMap.set(key, () => resolveFromRequestScope(scope, symbol));
				ownerByKey.set(key, importedModule.name);
			}
		}

		for (const [key, middleware] of Object.entries(m[preHandlersKey] ?? {})) {
			if (resolverMap.has(key)) {
				throw new ERRORS.MiddlewareNameConflictError(
					m.name,
					key,
					ownerByKey.get(key) ?? m.name,
					handlerType,
				);
			}

			const symbol = Symbol(`prehandler_${m.name}_${key}`);

			scope.register({
				[symbol]: this.resolveProvider({
					provider: middleware,
					resolutionScope: scope,
					module: m,
				}),
			});

			resolverMap.set(key, () => resolveFromRequestScope(scope, symbol));
			ownerByKey.set(key, m.name);
		}

		return resolverMap;
	}

	private resolveProvider({
		provider,
		resolutionScope,
		module,
		wrapForExport,
	}: {
		provider: AnyProvider | AnyMiddleware;
		resolutionScope: Awilix.AwilixContainer;
		module: M;
		wrapForExport?: boolean;
	}): Awilix.Resolver<any> {
		if (GUARGS.isPrimitive(provider)) {
			return Awilix.asValue(provider);
		}

		if (
			GUARGS.isPlainFunction(provider) &&
			!GUARGS.isCostructorProvider(provider)
		) {
			return Awilix.asValue(provider);
		}

		// Handle plain objects as values (not class instances or providers)
		if (
			typeof provider === "object" &&
			!GUARGS.isCostructorProvider(provider) &&
			!GUARGS.isFactoryProvider(provider) &&
			!GUARGS.isClassProvider(provider)
		) {
			return Awilix.asValue(provider);
		}

		const resolverOptions = this.extractResolverOptions(module, provider);

		if (GUARGS.isCostructorProvider(provider)) {
			const resolver = Awilix.asClass(provider, resolverOptions);

			return wrapForExport
				? Awilix.asFunction(
						() => resolver.resolve(resolutionScope),
						resolverOptions,
					)
				: resolver;
		}

		if (GUARGS.isFactoryProvider(provider)) {
			const factoryDeps = (provider.inject || []).map((k) =>
				// biome-ignore lint/style/noNonNullAssertion: dependencies are validated by ProviderDependencySorter
				resolutionScope.registrations[k]!.resolve(resolutionScope),
			);

			return Awilix.asFunction(
				() => provider.useFactory(...factoryDeps),
				resolverOptions,
			);
		}

		const baseResolver = Awilix.asClass(provider.useClass, resolverOptions);
		const resolver = provider.allowCircular
			? this.createProxyResolver(baseResolver, resolverOptions, wrapForExport)
			: baseResolver;

		return wrapForExport
			? Awilix.asFunction(() => {
					return resolver.resolve(
						resolverOptions.lifetime === Awilix.Lifetime.SINGLETON
							? resolutionScope
							: getOrCreateRequestScope(resolutionScope),
					);
				}, resolverOptions)
			: resolver;
	}

	private extractResolverOptions(
		module: M,
		provider: AnyProvider | AnyMiddleware,
	): Awilix.BuildResolverOptions<any> {
		const baseOptions = {
			...this.options.providerOptions,
			...module.providerOptions,
		};

		if (GUARGS.isClassProvider(provider)) {
			const { useClass, allowCircular, ...providerOptions } = provider;

			return {
				...baseOptions,
				...providerOptions,
			};
		}

		if (GUARGS.isFactoryProvider(provider)) {
			const { useClass, ...providerOptions } = GUARGS.isClassProvider(
				provider.provide,
			)
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
		resolver: Awilix.Resolver<any>,
		options: Awilix.BuildResolverOptions<any>,
		wrapForExport?: boolean,
	) {
		return Awilix.createBuildResolver({
			...options,
			resolve(container) {
				let resolved: any = null;

				return new Proxy(
					{},
					{
						get(_, name) {
							if (
								wrapForExport &&
								options?.lifetime === Awilix.Lifetime.TRANSIENT
							) {
								return resolver.resolve(container)[name];
							}

							if (!resolved) {
								resolved = resolver.resolve(container);
							}

							return resolved[name];
						},
					},
				);
			},
		});
	}

	private markModuleIfImportsUseForwardRef(m: M): void {
		if ((m.imports || []).some(GUARGS.isForwardRef))
			this.forwardRefModules.add(m);
	}

	private ensureCircularDependencyHasForwardRef(m: M, moduleChain: M[]): void {
		const hasForwardRefInCycle =
			this.forwardRefModules.has(m) ||
			moduleChain.some((module) => this.forwardRefModules.has(module));

		if (hasForwardRefInCycle) return;

		const chainNames = moduleChain.map((module) => module.name);
		throw new ERRORS.CircularModuleDependencyError(m.name, chainNames);
	}

	private ensureImportedModulesUniqueness(m: M, includeGlobalModules = false) {
		const importedNames = new Set<string>();

		const imports = [
			...(includeGlobalModules
				? this.globalModulesWithScope.map((el) => el.module)
				: []),
			...this.resolveImports(m),
		];

		for (const imported of imports) {
			if (importedNames.has(imported.name)) {
				throw new ERRORS.DuplicateModuleImportError(m.name, imported.name);
			}

			importedNames.add(imported.name);
		}
	}

	private ensureNoProviderNameConflicts(m: M, includeGlobalModules = false) {
		const moduleProviderKeys = Object.keys(m.providers || {});
		const rootProviderKeys = Object.keys(this.options.rootProviders || {});

		const rootConflicts = rootProviderKeys.filter((key) =>
			moduleProviderKeys.includes(key),
		);

		if (rootConflicts.length > 0) {
			throw new ERRORS.RootProviderNameConflictError(m.name, rootConflicts);
		}

		const importConflicts = [
			...(includeGlobalModules
				? this.globalModulesWithScope.flatMap(({ module: globalModule }) =>
						Object.keys(globalModule.exports || {}),
					)
				: []),
			...this.resolveImports(m).flatMap((importItem) =>
				Object.keys(importItem.exports || {}),
			),
		].filter((key) => moduleProviderKeys.includes(key));

		if (importConflicts.length > 0) {
			throw new ERRORS.ProviderNameConflictError(m.name, importConflicts);
		}
	}

	private resolveImports(m: M): M[] {
		return (m.imports || []).map((importItem) =>
			GUARGS.isForwardRef(importItem) ? importItem.resolve() : importItem,
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
