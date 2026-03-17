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
	type ControllerConstructor,
	isClassProvider,
	isCostructorProvider,
	isFactoryProvider,
	isForwardRef,
	isPrimitive,
	type AnyModule as M,
} from "./di-context.types.js";

// https://github.com/jeffijoe/awilix/pull/133#issuecomment-492989852
function createProxyResolver(
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

type ProdiderDepsGraph = {
	graph: Map<string, string[]>;
	inDegree: Map<string, number>;
};

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
	importedScopes: ImportedScopesMap;
}

export type ImportedScopesMap = Map<string, ModuleScopeTree>;

export class DIContext<TFramework = unknown> {
	private readonly rootContainer: AwilixContainer;
	private readonly registeredControllers = new WeakMap<
		ControllerConstructor<TFramework>,
		M
	>();
	private readonly forwardRefModules = new WeakSet<M>();
	private readonly moduleScopeMap = new WeakMap<M, AwilixContainer>();
	private readonly options: DiContextOptions<TFramework> &
		Required<Pick<DiContextOptions, "providerOptions" | "rootProviders">> = {
		rootProviders: {},
		providerOptions: {
			lifetime: Lifetime.SCOPED,
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

		this.rootContainer = createContainer(options.containerOptions);
		this.rootContainer.register(this.options.rootProviders);
	}

	registerModule(module: M): ModuleScopeTree {
		return this.registerModuleWithScope(
			module,
			this.rootContainer.createScope(),
			[],
		);
	}

	private registerModuleWithScope(
		m: M,
		scope: AwilixContainer,
		moduleChain: M[],
	): ModuleScopeTree {
		// Pre-scan imports: if this module uses forwardRef, mark it before circular check
		const importsList = m.imports || [];
		for (const importItem of importsList) {
			if (isForwardRef(importItem)) {
				this.forwardRefModules.add(m);
				// break;
			}
		}

		// Check for circular dependency
		const isCircular = moduleChain.includes(m);
		if (isCircular) {
			const hasForwardRefInCycle =
				this.forwardRefModules.has(m) ||
				moduleChain.some((module) => this.forwardRefModules.has(module));

			if (!hasForwardRefInCycle) {
				const chainNames = moduleChain.map((module) => module.name);
				throw new ERRORS.CircularModuleDependencyError(m.name, chainNames);
			}

			// Circular but allowed via forwardRef - return the existing scope being built
			const existingScope = this.moduleScopeMap.get(m);
			if (existingScope) {
				return {
					name: m.name,
					scope: existingScope,
					importedScopes: new Map(),
				};
			}
			// Fallback to empty scope if not found (shouldn't happen)
			return {
				name: m.name,
				scope,
				importedScopes: new Map(),
			};
		}

		// Store the scope in the map before processing (for circular references)
		this.moduleScopeMap.set(m, scope);

		this.ensureImportedModulesUniqueness(m);
		this.ensureNoProviderNameConflicts(m);

		const importedModulesWithScope = importsList.map((importItem) => {
			const importedModule = isForwardRef(importItem)
				? importItem.resolve()
				: importItem;

			return {
				...this.registerModuleWithScope(
					importedModule,
					this.rootContainer.createScope(),
					[...moduleChain, m],
				),
				module: importedModule,
			};
		});

		const resolvedExportedFromImports = importedModulesWithScope
			.flatMap(({ module: importedModule, scope: importedScope }) => {
				return Object.entries(importedModule.exports || {}).map(
					([key, provider]) => {
						const options = {
							...this.options.providerOptions,
							...importedModule.providerOptions,
						};

						if (isPrimitive(provider)) {
							return {
								key,
								scope: null,
								provider,
								options,
							};
						}

						if (isCostructorProvider(provider)) {
							return {
								key,
								provider: asClass(provider),
								scope: importedScope,
								options,
							};
						}

						if (isFactoryProvider(provider)) {
							const { useClass, ...awilixOptions } = isClassProvider(
								provider.provide,
							)
								? provider.provide
								: {};

							const factoryDeps = (provider.inject || []).map((key) => {
								if (!importedScope.registrations[key]) {
									throw new ERRORS.ProviderNotFoundError(key, m.name);
								}

								return importedScope.registrations[key].resolve(scope);
							});

							return {
								key,
								provider: () => provider.useFactory(...factoryDeps),
								scope: importedScope,
								options: {
									...options,
									...awilixOptions,
								},
							};
						}

						if (isClassProvider(provider)) {
							const { useClass, allowCircular, ...awilixOptions } = provider;
							const resolver = asClass(useClass, {
								...options,
								...awilixOptions,
							});

							return {
								key,
								provider: allowCircular
									? createProxyResolver(resolver, {
											...options,
											...awilixOptions,
										})
									: resolver,
								scope: importedScope,
								allowCircular,
								options: {
									...options,
									...awilixOptions,
								},
							};
						}

						throw new ERRORS.UnsupportedProviderTypeError(
							key,
							importedModule.name,
						);
					},
				);
			})
			.reduce<Record<string, Resolver<any>>>((acc, curr) => {
				// Always build with imported scope to ensure access to sibling providers
				acc[curr.key] = curr.scope
					? asFunction(() => curr.scope.build(curr.provider), curr.options)
					: asValue(curr.provider);

				return acc;
			}, {});

		scope.register(resolvedExportedFromImports);

		Object.entries(this.sortProvidersByDependencies(m)).forEach(
			([key, provider]) => {
				if (isFactoryProvider(provider)) {
					const { useClass, ...awilixOptions } = isClassProvider(
						provider.provide,
					)
						? provider.provide
						: {};

					const factoryDeps = (provider.inject || []).map((key) => {
						if (!scope.registrations[key]) {
							throw new ERRORS.ProviderNotFoundError(key, m.name);
						}

						return scope.registrations[key].resolve(scope);
					});

					scope.register({
						[key]: asFunction(() => provider.useFactory(...factoryDeps), {
							...this.options.providerOptions,
							...m.providerOptions,
							...awilixOptions,
						}),
					});

					return;
				}

				if (isClassProvider(provider)) {
					const { useClass, allowCircular, ...awilixOptions } = provider;
					const options = {
						...this.options.providerOptions,
						...m.providerOptions,
						...awilixOptions,
					};
					const resolver = asClass(useClass, options);

					scope.register({
						[key]: allowCircular
							? createProxyResolver(resolver, options)
							: resolver,
					});

					return;
				}

				if (isCostructorProvider(provider)) {
					scope.register({
						[key]: asClass(provider, {
							...this.options.providerOptions,
							...m.providerOptions,
						}),
					});

					return;
				}

				if (isPrimitive(provider)) {
					scope.register({
						[key]: asValue(provider),
					});
				}
			},
		);

		this.processQueryHandlers(m, scope);
		this.processCommandHandlers(m, scope);
		this.processControllers(m, scope);

		const importedScopes = importedModulesWithScope.reduce<
			ModuleScopeTree["importedScopes"]
		>((acc, { module, ...rest }) => {
			acc.set(rest.name, rest);

			return acc;
		}, new Map());

		return { scope, importedScopes, name: m.name };
	}

	private processQueryHandlers(m: M, scope: AwilixContainer) {
		if (!this.options.onQueryHandler || !m.queryHandlers?.length) return;

		for (const HandlerClass of m.queryHandlers) {
			const handlerSymbol = Symbol(`q-handler_${HandlerClass.name}`);

			scope.register({
				[handlerSymbol]: asClass(HandlerClass, {
					...this.options.providerOptions,
					...m.providerOptions,
				}),
			});

			this.options.onQueryHandler(() => scope.resolve(handlerSymbol));
		}
	}

	private processCommandHandlers(m: M, scope: AwilixContainer) {
		if (!this.options.onCommandHandler || !m.commandHandlers?.length) return;

		for (const HandlerClass of m.commandHandlers) {
			const handlerSymbol = Symbol(`c-handler_${HandlerClass.name}`);

			scope.register({
				[handlerSymbol]: asClass(HandlerClass, {
					...this.options.providerOptions,
					...m.providerOptions,
				}),
			});

			this.options.onCommandHandler(() => scope.resolve(handlerSymbol));
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

	private sortProvidersByDependencies(m: M): NonNullable<typeof m.providers> {
		const depsGraph = this.buildDepGraph(m, this.initializeDepGraph(m));
		const initialQueue = this.initializeQueue(depsGraph.inDegree);

		const sortedKeys = this.sortProviderKeysTopologically(
			depsGraph,
			initialQueue,
		);

		this.ensureNoCyclicDependencies(m, sortedKeys);

		return sortedKeys.reduce<NonNullable<typeof m.providers>>((acc, key) => {
			const provider = m.providers?.[key];
			// Provider might be boolean. That's why not only undefined check
			if (provider !== undefined) acc[key] = provider;

			return acc;
		}, {});
	}

	private initializeDepGraph(m: M): ProdiderDepsGraph {
		return Object.keys(m.providers || {}).reduce<ProdiderDepsGraph>(
			(acc, curr) => {
				acc.graph.set(curr, []);
				acc.inDegree.set(curr, 0);

				return acc;
			},
			{
				graph: new Map(),
				inDegree: new Map(),
			},
		);
	}

	private buildDepGraph(m: M, depsGraph: ProdiderDepsGraph): ProdiderDepsGraph {
		const importedProviderKeys = new Set(
			(m.imports || []).flatMap((importItem) => {
				const importedModule = isForwardRef(importItem)
					? importItem.resolve()
					: importItem;
				return Object.keys(importedModule.exports || {});
			}),
		);

		return Object.entries(m.providers || {}).reduce<ProdiderDepsGraph>(
			(acc, [key, provider]) => {
				if (!isFactoryProvider(provider) || !provider.inject) return acc;

				provider.inject.forEach((dep) => {
					const depList = acc.graph.get(dep);

					if (depList) {
						depList.push(key);
						acc.inDegree.set(key, (acc.inDegree.get(key) || 0) + 1);

						return;
					}

					if (!depList && !importedProviderKeys.has(dep)) {
						throw new ERRORS.DependencyNotFoundError(dep, m.name);
					}
				});

				return acc;
			},
			{ ...depsGraph },
		);
	}

	private sortProviderKeysTopologically(
		depsGraph: ProdiderDepsGraph,
		queue: string[],
		result: string[] = [],
	): string[] {
		const [current, ...restQueue] = queue;

		if (!current) return result;

		const deps = depsGraph.graph.get(current) || [];

		const inDegree = deps.reduce((acc, curr) => {
			acc.set(curr, (acc.get(curr) || 0) - 1);

			return acc;
		}, new Map(depsGraph.inDegree));

		return this.sortProviderKeysTopologically(
			{ ...depsGraph, inDegree },
			[...restQueue, ...deps.filter((dep) => inDegree.get(dep) === 0)],
			[...result, current],
		);
	}

	private initializeQueue(inDegree: ProdiderDepsGraph["inDegree"]): string[] {
		return Array.from(inDegree.entries())
			.filter(([_, degree]) => degree === 0)
			.map(([key]) => key);
	}

	private ensureNoCyclicDependencies(m: M, sortedKeys: string[]) {
		const providerKeys = Object.keys(m.providers || {});

		if (sortedKeys.length !== providerKeys.length) {
			const remaining = providerKeys.filter((key) => !sortedKeys.includes(key));

			throw new ERRORS.CircularDependencyError(m.name, remaining);
		}
	}

	private ensureImportedModulesUniqueness(m: M) {
		const importedNames = new Set<string>();

		for (const importItem of m.imports || []) {
			const imported = isForwardRef(importItem)
				? importItem.resolve()
				: importItem;

			if (importedNames.has(imported.name)) {
				throw new ERRORS.DuplicateModuleImportError(m.name, imported.name);
			}

			importedNames.add(imported.name);
		}
	}

	private ensureNoProviderNameConflicts(m: M) {
		const moduleProviderKeys = Object.keys(m.providers || {});
		const importedProviderKeys = (m.imports || []).flatMap((importItem) => {
			const importedModule = isForwardRef(importItem)
				? importItem.resolve()
				: importItem;
			return Object.keys(importedModule.exports || {});
		});

		const conflicts = importedProviderKeys.filter((key) =>
			moduleProviderKeys.includes(key),
		);

		if (conflicts.length > 0) {
			throw new ERRORS.ProviderNameConflictError(m.name, conflicts);
		}
	}
}
