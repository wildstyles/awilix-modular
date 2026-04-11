import type { Mediator } from "../mediator/mediator.js";
import type { EmptyObject, UnknownRecord } from "./common.types.js";
import type {
	ModuleImport,
	StaticModule,
	StaticModuleDef,
	WithForRootConfig,
} from "./module.types.js";
import type {
	ClassHandler,
	ConstructorHandler,
	DefProviderMap,
} from "./provider.types.js";

// biome-ignore lint/suspicious/noEmptyInterface: Intentionally empty for declaration merging
export interface CommonDependencies {}

// ============================================================================
// ModuleDef
// ============================================================================

export type ModuleDef<
	D extends {
		providers?: DefProviderMap;
		exportKeys?: D["providers"] extends DefProviderMap
			? keyof D["providers"]
			: never;
		imports?: readonly ModuleImport[];
		forRootConfig?: UnknownRecord;
		queryHandlers?: readonly any[];
		commandHandlers?: readonly any[];
	},
> = {
	providers: ResolveProviders<D>;
	exports: ResolveExports<D>;
	imports: ResolveImports<D>;
	deps: ResolveDeps<D>;
	queryHandlers: ResolveQueryHandlers<D>;
	commandHandlers: ResolveCommandHandlers<D>;
} & ResolveForRootConfig<D>;

// ============================================================================
// ModuleDef Resolvers
// ============================================================================

type ResolveProviders<D extends { providers?: DefProviderMap }> =
	D["providers"] extends DefProviderMap ? D["providers"] : EmptyObject;

type ResolveExports<
	D extends {
		providers?: DefProviderMap;
		exportKeys?: keyof NonNullable<D["providers"]>;
	},
> = D["providers"] extends DefProviderMap
	? D["exportKeys"] extends keyof D["providers"]
		? Pick<D["providers"], D["exportKeys"]>
		: EmptyObject
	: EmptyObject;

type ResolveImports<D extends { imports?: readonly ModuleImport[] }> =
	D["imports"] extends readonly ModuleImport[] ? D["imports"] : [];

type ResolveQueryHandlers<D extends { queryHandlers?: readonly any[] }> =
	D["queryHandlers"] extends readonly any[] ? D["queryHandlers"] : [];

type ResolveCommandHandlers<D extends { commandHandlers?: readonly any[] }> =
	D["commandHandlers"] extends readonly any[] ? D["commandHandlers"] : [];

type ResolveForRootConfig<D extends Partial<WithForRootConfig>> =
	D["forRootConfig"] extends WithForRootConfig["forRootConfig"]
		? { forRootConfig: D["forRootConfig"] }
		: EmptyObject;

// ============================================================================
// ResolveDeps
// ============================================================================

type ResolveDeps<
	D extends {
		providers?: DefProviderMap;
		imports?: readonly ModuleImport[];
		queryHandlers?: readonly any[];
		commandHandlers?: readonly any[];
	},
> = ResolveProviders<D> &
	(D["imports"] extends readonly ModuleImport[]
		? ExtractExportsFromImports<D["imports"]>
		: DefProviderMap) &
	ResolveQueryMediator<D> &
	ResolveCommandMediator<D> &
	CommonDependencies;

type ExtractModuleDefFromModule<T> =
	T extends StaticModule<infer TDef extends StaticModuleDef>
		? TDef
		: T extends { exports: infer E }
			? { exports: E }
			: never;

type ExtractExportsFromImports<T extends readonly ModuleImport[]> =
	T extends readonly [
		infer First,
		...infer Rest extends readonly ModuleImport[],
	]
		? ExtractModuleDefFromModule<First> extends { exports: infer E }
			? E & ExtractExportsFromImports<Rest>
			: ExtractExportsFromImports<Rest>
		: EmptyObject;

type ResolveQueryMediator<D extends { queryHandlers?: readonly any[] }> =
	D["queryHandlers"] extends readonly [any, ...any[]]
		? { queryMediator: Mediator<ResolveQueryContracts<D>> }
		: EmptyObject;

type ResolveCommandMediator<D extends { commandHandlers?: readonly any[] }> =
	D["commandHandlers"] extends readonly [any, ...any[]]
		? { commandMediator: Mediator<ResolveCommandContracts<D>> }
		: EmptyObject;

// ============================================================================
// Contract Extraction from Handlers
// ============================================================================

type ResolveQueryContracts<D extends { queryHandlers?: readonly any[] }> =
	D["queryHandlers"] extends readonly any[]
		? ExtractContractsFromHandlers<D["queryHandlers"]>
		: EmptyObject;

type ResolveCommandContracts<D extends { commandHandlers?: readonly any[] }> =
	D["commandHandlers"] extends readonly any[]
		? ExtractContractsFromHandlers<D["commandHandlers"]>
		: EmptyObject;

type ExtractContractsFromHandlers<Handlers extends readonly any[]> =
	Handlers extends readonly [infer First, ...infer Rest]
		? ExtractContractFromHandler<First> & ExtractContractsFromHandlers<Rest>
		: EmptyObject;

type ExtractContractFromHandler<H> =
	H extends ConstructorHandler<infer C>
		? C
		: H extends ClassHandler
			? H["useClass"] extends ConstructorHandler<infer C>
				? C
				: never
			: never;
