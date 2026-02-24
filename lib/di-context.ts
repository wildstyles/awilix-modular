import {
	type AwilixContainer,
	asClass,
	asFunction,
	asValue,
	type BuildResolverOptions,
	type ContainerOptions,
	createContainer,
	Lifetime,
	type Resolver,
} from "awilix";

import {
	type ControllerConstructor,
	type HandlerConstructor,
	isClassProvider,
	isCostructorProvider,
	isFactoryProvider,
	isPrimitive,
	type AnyModule as M,
} from "./di-context.types.js";

type ProdiderDepsGraph = {
	graph: Map<string, string[]>;
	inDegree: Map<string, number>;
};

interface DiContextOptions<TFramework = unknown> {
	onHandler?: (
		HandlerClass: HandlerConstructor,
		scope: AwilixContainer,
	) => void;
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
		);
	}

	private registerModuleWithScope(
		m: M,
		scope: AwilixContainer,
	): ModuleScopeTree {
		this.ensureImportedModulesUniqueness(m);
		this.ensureNoProviderNameConflicts(m);

		const importedModulesWithScope = m.imports.map((importedModule) => {
			return {
				...this.registerModuleWithScope(
					importedModule,
					this.rootContainer.createScope(),
				),
				module: importedModule,
			};
		});

		const resolvedExportedFromImports = importedModulesWithScope
			.flatMap(({ module: importedModule, scope: importedScope }) => {
				return Object.entries(importedModule.exports).map(([key, provider]) => {
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

					// TODO: add factory providers
					if (isCostructorProvider(provider)) {
						return {
							key,
							provider,
							scope: importedScope,
							options,
						};
					}

					if (isClassProvider(provider)) {
						const { useClass, ...awilixOptions } = provider;

						return {
							key,
							provider: useClass,
							scope: importedScope,
							options: {
								...options,
								...awilixOptions,
							},
						};
					}

					throw new Error(
						`Unsupported provider type for "${key}" in module "${importedModule.name}"`,
					);
				});
			})
			.reduce<Record<string, Resolver<any>>>((acc, curr) => {
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
							throw new Error(`Provider ${key} is not exist in ${m.name}`);
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
					const { useClass, ...awilixOptions } = provider;

					scope.register({
						[key]: asClass(useClass, {
							...this.options.providerOptions,
							...m.providerOptions,
							...awilixOptions,
						}),
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
		if (!this.options.onHandler || !m.queryHandlers?.length) return;

		for (const HandlerClass of m.queryHandlers) {
			this.options.onHandler(HandlerClass, scope);
		}
	}

	private processControllers(m: M, diScope: AwilixContainer) {
		if (!this.options.onController || !m.controllers?.length) return;

		if (new Set(m.controllers).size !== m.controllers.length) {
			throw new Error(
				`Module "${m.name}" has duplicate controllers in its controllers array.`,
			);
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
			throw new Error(
				`Controller "${ControllerClass.name}" is already registered in module "${existingModule.name}". ` +
					`Controllers must be unique across modules. ` +
					`Exclude controllers from one of the module instances.`,
			);
		}
	}

	private sortProvidersByDependencies(m: M): typeof m.providers {
		const depsGraph = this.buildDepGraph(m, this.initializeDepGraph(m));
		const initialQueue = this.initializeQueue(depsGraph.inDegree);

		const sortedKeys = this.sortProviderKeysTopologically(
			depsGraph,
			initialQueue,
		);

		this.ensureNoCyclicDependencies(m, sortedKeys);

		return sortedKeys.reduce<typeof m.providers>((acc, key) => {
			const provider = m.providers[key];
			// Provider might be boolean. That's why not only undefined check
			if (provider !== undefined) acc[key] = provider;

			return acc;
		}, {});
	}

	private initializeDepGraph(m: M): ProdiderDepsGraph {
		return Object.keys(m.providers).reduce<ProdiderDepsGraph>(
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
		return Object.entries(m.providers).reduce<ProdiderDepsGraph>(
			(acc, [key, provider]) => {
				if (!isFactoryProvider(provider) || !provider.inject) return acc;

				provider.inject.forEach((dep) => {
					const depList = acc.graph.get(dep);

					if (!depList) {
						throw new Error(
							`"${dep}" does not exist in scope of ${m.name} module`,
						);
					}

					depList.push(key);
					acc.inDegree.set(key, (acc.inDegree.get(key) || 0) + 1);
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
		const providerKeys = Object.keys(m.providers);

		if (sortedKeys.length !== providerKeys.length) {
			const remaining = providerKeys.filter((key) => !sortedKeys.includes(key));

			throw new Error(
				`Circular dependency detected in module "${m.name}" for providers: ${remaining.join(", ")}`,
			);
		}
	}

	private ensureImportedModulesUniqueness(m: M) {
		const importedNames = new Set<string>();

		for (const imported of m.imports) {
			if (importedNames.has(imported.name)) {
				throw new Error(
					`Module "${m.name}" has duplicate import of "${imported.name}"`,
				);
			}

			importedNames.add(imported.name);
		}
	}

	private ensureNoProviderNameConflicts(m: M) {
		const moduleProviderKeys = Object.keys(m.providers);
		const importedProviderKeys = m.imports.flatMap((importedModule) =>
			Object.keys(importedModule.exports),
		);

		const conflicts = importedProviderKeys.filter((key) =>
			moduleProviderKeys.includes(key),
		);

		if (conflicts.length > 0) {
			throw new Error(
				`Module "${m.name}" has provider name conflicts with imported modules: ${conflicts.join(", ")}`,
			);
		}
	}
}
