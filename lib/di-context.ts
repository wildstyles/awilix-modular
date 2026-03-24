import {
	type AwilixContainer,
	asClass,
	asFunction,
	asValue,
	type BuildResolverOptions,
	type ContainerOptions,
	createBuildResolver,
	createContainer,
	InjectionMode,
	Lifetime,
	type Resolver,
} from "awilix";
import { ControllerProcessor } from "./controller-processor.js";
import type { Handler } from "./cqrs/cqrs.types.js";
import * as ERRORS from "./di-context.errors.js";
import {
	type AnyProvider,
	type ClassHandler,
	isClassHandler,
	isClassProvider,
	isCostructorProvider,
	isFactoryProvider,
	isForwardRef,
	isPrimitive,
	type AnyModule as M,
} from "./di-context.types.js";
import { ProviderDependencySorter } from "./provider-dependency-sorter.js";

export interface DiContextOptions {
	framework: unknown;
	onQueryHandler?: (resolveHandler: () => Handler<any, string>) => void;
	onCommandHandler?: (resolveHandler: () => Handler<any, string>) => void;
	containerOptions?: ContainerOptions;
	rootProviders?: Record<string, AnyProvider>;
	providerOptions?: Partial<BuildResolverOptions<any>>;
}

export interface ModuleScopeTree<S extends AwilixContainer = AwilixContainer> {
	name: string;
	scope: S;
	importedScopes: Map<string, ModuleScopeTree>;
}

const ROOT_PROVIDERS_RESOLVER_MAP_SYMBOL = Symbol("rootProvidersResolverMap");

export class DIContext {
	private readonly forwardRefModules = new WeakSet<M>();
	private readonly moduleScopeMap = new WeakMap<M, AwilixContainer>();
	private readonly sorter = new ProviderDependencySorter();
	private readonly controllerProcessor: ControllerProcessor;
	private readonly options: DiContextOptions;
	private readonly rootContainer: AwilixContainer;

	private constructor(options: DiContextOptions) {
		this.options = {
			...options,
			containerOptions: {
				strict: true,
				injectionMode: InjectionMode.CLASSIC,
				...options.containerOptions,
			},
			providerOptions: {
				lifetime: Lifetime.SINGLETON,
				...options.providerOptions,
			},
		};

		this.controllerProcessor = new ControllerProcessor(
			this.options.framework,
			this.options.providerOptions || {},
		);

		this.rootContainer = createContainer(this.options.containerOptions);
		this.initializeRootProviders();
	}

	static create(module: M, options: DiContextOptions): ModuleScopeTree {
		const context = new DIContext(options);

		return context.registerModuleWithScope(
			module,
			context.createContainerWithRootProviders(),
			[],
		);
	}

	private createContainerWithRootProviders(): AwilixContainer {
		const container = createContainer(this.options.containerOptions);
		container.register(
			this.rootContainer.resolve(ROOT_PROVIDERS_RESOLVER_MAP_SYMBOL) as Record<
				string,
				Resolver<any>
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
						key,
						provider,
						resolutionScope: this.rootContainer,
						module: rootProvidersModule,
					}),
				});
			},
		);

		const wrappedResolvers = Object.entries(
			rootProvidersModule.providers || {},
		).reduce<Record<string, Resolver<any>>>((acc, [key, provider]) => {
			acc[key] = asFunction(
				() => this.rootContainer.resolve(key),
				this.extractResolverOptions(rootProvidersModule, provider),
			);

			return acc;
		}, {});

		this.rootContainer.register({
			[ROOT_PROVIDERS_RESOLVER_MAP_SYMBOL]: asValue(wrappedResolvers),
		});
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

		const importedModulesWithScope = this.resolveImports(m).map((module) => ({
			...this.registerModuleWithScope(
				module,
				this.createContainerWithRootProviders(),
				[...moduleChain, m],
			),
			module,
		}));

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
		this.controllerProcessor.processControllers(m, scope);

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

		// Handle plain objects as values (not class instances or providers)
		if (
			typeof provider === "object" &&
			!isCostructorProvider(provider) &&
			!isFactoryProvider(provider) &&
			!isClassProvider(provider)
		) {
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
				? this.createProxyResolver(baseResolver, resolverOptions, wrapForExport)
				: baseResolver;

			return wrapForExport
				? asFunction(() => {
						return resolver.resolve(
							resolverOptions.lifetime === Lifetime.SINGLETON
								? resolutionScope
								: resolutionScope.createScope(),
						);
					}, resolverOptions)
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
		options: BuildResolverOptions<any>,
		wrapForExport?: boolean,
	) {
		return createBuildResolver({
			...options,
			resolve(container) {
				let resolved: any = null;

				return new Proxy(
					{},
					{
						get(_, name) {
							if (wrapForExport && options?.lifetime === Lifetime.TRANSIENT) {
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
		const rootProviderKeys = Object.keys(this.options.rootProviders || {});

		const rootConflicts = rootProviderKeys.filter((key) =>
			moduleProviderKeys.includes(key),
		);

		if (rootConflicts.length > 0) {
			throw new ERRORS.RootProviderNameConflictError(m.name, rootConflicts);
		}

		const importedProviderKeys = this.resolveImports(m).flatMap((importItem) =>
			Object.keys(importItem.exports || {}),
		);
		const importConflicts = importedProviderKeys.filter((key) =>
			moduleProviderKeys.includes(key),
		);

		if (importConflicts.length > 0) {
			throw new ERRORS.ProviderNameConflictError(m.name, importConflicts);
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
