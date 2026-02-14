import { asValue, AwilixContainer, NameAndRegistrationPair } from "awilix";

import {
  AnyModule,
  isFactoryProvider,
  isResolver,
} from "./di-context.types.js";

type ProdiderDepsGraph = {
  graph: Map<string, string[]>;
  inDegree: Map<string, number>;
};

export class DIContext<M extends AnyModule = AnyModule> {
  // TODO: do scope caching for dynamic modules
  public readonly moduleScopes = new Map<string, AwilixContainer>();
  private readonly rootContainer: AwilixContainer;

  constructor(rootContainer: AwilixContainer) {
    this.rootContainer = rootContainer;
  }

  registerModules(modules: M[]) {
    return modules.map((module) => {
      const scope = this.rootContainer.createScope();

      this.registerProvidersWithImports(module, scope);

      return { scope, name: module.name };
    });
  }

  private registerProvidersWithImports(m: M, targetScope?: AwilixContainer) {
    if (this.moduleScopes.has(m.name)) {
      return this.moduleScopes.get(m.name)!;
    }

    this.ensureImportedModulesUniqueness(m);
    this.ensureNoProviderNameConflicts(m);

    const scope = targetScope || this.rootContainer.createScope();
    const resolvedExportedFromImports = m.imports
      .flatMap((importedModule) => {
        const importedScope = this.registerProvidersWithImports(importedModule);

        return Object.entries(importedScope.registrations)
          .filter(([key]) => key in importedModule.exports)
          .map(([key, registration]) => ({
            key,
            registration,
            scope: importedScope,
          }));
      })
      .reduce<NameAndRegistrationPair<Record<string, object>>>((acc, curr) => {
        acc[curr.key] = isResolver(curr.registration)
          ? asValue(curr.registration.resolve(curr.scope))
          : curr.registration;

        return acc;
      }, {});

    scope.register(resolvedExportedFromImports);

    Object.entries(this.sortProvidersByDependencies(m)).forEach(
      ([key, provider]) => {
        if (isResolver(provider)) {
          // TODO: isResolver doesn't allow to register asValue resolvers
          scope.register({ [key]: provider });

          return;
        }

        if (isFactoryProvider(provider)) {
          const factoryDeps = (provider.inject || []).map((key) => {
            if (!scope.registrations[key]) {
              throw new Error(`Provider ${key} is not exist in ${m.name}`);
            }

            return scope.registrations[key].resolve(scope);
          });

          scope.register({
            [key]: asValue(provider.useFactory(...factoryDeps)),
          });
        }
      },
    );

    this.moduleScopes.set(m.name, scope);

    return scope;
  }

  // // TODO: make similar registration for event/command bus
  // private registerQueryHandlersInBus(m: M, diScope: AwilixContainer) {
  //   for (const HandlerClass of m.queryHandlers || []) {
  //     // I don't want handlers to be registered in providers scope.
  //     // Therefore it's only built and registered within query bus
  //     const handler = diScope.build(HandlerClass);
  //
  //     this.fastify.queryBus.register(
  //       handler.key,
  //       handler.executor.bind(handler),
  //     );
  //   }
  // }

  private sortProvidersByDependencies(m: M): typeof m.providers {
    const depsGraph = this.buildDepGraph(m, this.initializeDepGraph(m));
    const initialQueue = this.initializeQueue(depsGraph.inDegree);

    const sortedKeys = this.sortProviderKeysTopologically(
      depsGraph,
      initialQueue,
    );

    this.ensureNoCyclicDependencies(m, sortedKeys);

    return sortedKeys.reduce<typeof m.providers>((acc, key) => {
      acc[key] = m.providers[key]!;

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
