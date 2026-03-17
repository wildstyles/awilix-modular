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
	isClassHandler,
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
	private readonly rootContainer: AwilixContainer;
	private readonly registeredControllers = new WeakMap<
		ControllerConstructor<TFramework>,
		M
	>();
	private readonly forwardRefModules = new WeakSet<M>();
	private readonly moduleScopeMap = new WeakMap<M, AwilixContainer>();
	private readonly sorter = new ProviderDependencySorter();
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

		const importedModulesWithScope = (m.imports || []).map((imported) => {
			const module = isForwardRef(imported) ? imported.resolve() : imported;

			return {
				...this.registerModuleWithScope(
					module,
					this.rootContainer.createScope(),
					[...moduleChain, m],
				),
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

		this.processQueryHandlers(m, scope);
		this.processCommandHandlers(m, scope);
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
		// TODO: remove any
		provider: any;
		resolutionScope: AwilixContainer;
		module: M;
		wrapForExport?: boolean;
	}): Resolver<any> {
		const baseOptions = {
			...this.options.providerOptions,
			...module.providerOptions,
		};

		if (isPrimitive(provider)) {
			return asValue(provider);
		}

		if (isCostructorProvider(provider)) {
			const resolver = asClass(provider, baseOptions);

			return wrapForExport
				? asFunction(() => resolver.resolve(resolutionScope), baseOptions)
				: resolver;
		}

		if (isFactoryProvider(provider)) {
			const { useClass, ...awilixOptions } = isClassProvider(provider.provide)
				? provider.provide
				: {};

			const factoryDeps = (provider.inject || []).map((k) => {
				if (!resolutionScope.registrations[k]) {
					throw new ERRORS.ProviderNotFoundError(key, module.name);
				}

				return resolutionScope.registrations[k].resolve(resolutionScope);
			});

			return asFunction(() => provider.useFactory(...factoryDeps), {
				...baseOptions,
				...awilixOptions,
			});
		}

		if (isClassProvider(provider)) {
			const { useClass, allowCircular, ...awilixOptions } = provider;
			const baseResolver = asClass(useClass, {
				...baseOptions,
				...awilixOptions,
			});
			const resolver = allowCircular
				? this.createProxyResolver(baseResolver, {
						...baseOptions,
						...awilixOptions,
					})
				: baseResolver;

			return wrapForExport
				? asFunction(() => resolutionScope.build(resolver), {
						...baseOptions,
						...awilixOptions,
					})
				: resolver;
		}

		throw new ERRORS.UnsupportedProviderTypeError(key, module.name);
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

	private processQueryHandlers(m: M, scope: AwilixContainer) {
		if (!this.options.onQueryHandler || !m.queryHandlers?.length) return;

		for (const HandlerClass of m.queryHandlers) {
			const handlerSymbol = Symbol(`q-handler_${HandlerClass.name}`);
			const { useClass, ...awilixOptions } = isClassHandler(HandlerClass)
				? HandlerClass
				: { useClass: HandlerClass };

			scope.register({
				[handlerSymbol]: asClass(useClass, {
					...this.options.providerOptions,
					...m.providerOptions,
					...awilixOptions,
				}),
			});

			this.options.onQueryHandler(() => scope.resolve(handlerSymbol));
		}
	}

	private processCommandHandlers(m: M, scope: AwilixContainer) {
		if (!this.options.onCommandHandler || !m.commandHandlers?.length) return;

		for (const HandlerClass of m.commandHandlers) {
			const handlerSymbol = Symbol(`c-handler_${HandlerClass.name}`);
			const { useClass, ...awilixOptions } = isClassHandler(HandlerClass)
				? HandlerClass
				: { useClass: HandlerClass };

			scope.register({
				[handlerSymbol]: asClass(useClass, {
					...this.options.providerOptions,
					...m.providerOptions,
					...awilixOptions,
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

	private buildImportedScopesMap(
		importedModulesWithScope: (ModuleScopeTree & { module: M })[],
	): ModuleScopeTree["importedScopes"] {
		return importedModulesWithScope.reduce((acc, { module, ...rest }) => {
			acc.set(rest.name, rest);

			return acc;
		}, new Map());
	}
}
