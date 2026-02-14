import { AwilixContainer } from "awilix";
import { AnyModule } from "./di-context.types.js";
export declare class DIContext<M extends AnyModule = AnyModule> {
	readonly moduleScopes: Map<string, AwilixContainer<any>>;
	private readonly rootContainer;
	constructor(rootContainer: AwilixContainer);
	registerModules(modules: M[]): {
		scope: AwilixContainer<any>;
		name: string;
	}[];
	private registerProvidersWithImports;
	private sortProvidersByDependencies;
	private initializeDepGraph;
	private buildDepGraph;
	private sortProviderKeysTopologically;
	private initializeQueue;
	private ensureNoCyclicDependencies;
	private ensureImportedModulesUniqueness;
	private ensureNoProviderNameConflicts;
}
