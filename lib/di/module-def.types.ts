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
	DefPreHandlerMap,
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
		exportQueryPreHandlerKeys?: D["queryPreHandlers"] extends DefPreHandlerMap
			? keyof D["queryPreHandlers"]
			: never;
		exportCommandPreHandlerKeys?: D["commandPreHandlers"] extends DefPreHandlerMap
			? keyof D["commandPreHandlers"]
			: never;
		imports?: readonly ModuleImport[];
		forRootConfig?: UnknownRecord;
		queryHandlers?: readonly any[];
		commandHandlers?: readonly any[];
		queryPreHandlers?: DefPreHandlerMap;
		commandPreHandlers?: DefPreHandlerMap;
		queryContext?: Record<string, unknown>;
		commandContext?: Record<string, unknown>;
	},
> = {
	providers: ExtractProviders<D>;
	exports: ExtractExports<D>;
	queryPreHandlerExports: ExtractPreHandlerExports<"query", D>;
	commandPreHandlerExports: ExtractPreHandlerExports<"command", D>;
	imports: ExtractImports<D>;
	deps: ExtractDeps<D>;
	queryHandlers: ExtractHandlers<"query", D>;
	commandHandlers: ExtractHandlers<"command", D>;
	queryPreHandlers: ExtractPreHandlers<"query", D>;
	commandPreHandlers: ExtractPreHandlers<"command", D>;
} & ExtractForRootConfig<D>;

// ============================================================================
// ModuleDef Extracts
// ============================================================================

type ExtractProviders<D extends { providers?: DefProviderMap }> =
	D["providers"] extends DefProviderMap ? D["providers"] : EmptyObject;

type HandlerKind = "query" | "command";
type HandlerKindMap = {
	query: {
		handlersKey: "queryHandlers";
		preHandlersKey: "queryPreHandlers";
		exportPreHandlerKeysKey: "exportQueryPreHandlerKeys";
		preHandlerExportsKey: "queryPreHandlerExports";
	};
	command: {
		handlersKey: "commandHandlers";
		preHandlersKey: "commandPreHandlers";
		exportPreHandlerKeysKey: "exportCommandPreHandlerKeys";
		preHandlerExportsKey: "commandPreHandlerExports";
	};
};

type ExtractPreHandlerExports<
	TKind extends HandlerKind,
	D extends Record<string, unknown>,
> = D[HandlerKindMap[TKind]["preHandlersKey"]] extends DefPreHandlerMap
	? D[HandlerKindMap[TKind]["exportPreHandlerKeysKey"]] extends keyof D[HandlerKindMap[TKind]["preHandlersKey"]]
		? Pick<
				D[HandlerKindMap[TKind]["preHandlersKey"]],
				D[HandlerKindMap[TKind]["exportPreHandlerKeysKey"]]
			>
		: EmptyObject
	: EmptyObject;

type ExtractExports<
	D extends {
		providers?: DefProviderMap;
		exportKeys?: keyof NonNullable<D["providers"]>;
	},
> = D["providers"] extends DefProviderMap
	? D["exportKeys"] extends keyof D["providers"]
		? Pick<D["providers"], D["exportKeys"]>
		: EmptyObject
	: EmptyObject;

type ExtractImports<D extends { imports?: readonly ModuleImport[] }> =
	D["imports"] extends readonly ModuleImport[] ? D["imports"] : [];

type ExtractHandlers<
	TKind extends HandlerKind,
	D extends Record<string, unknown>,
> = D[HandlerKindMap[TKind]["handlersKey"]] extends readonly any[]
	? D[HandlerKindMap[TKind]["handlersKey"]]
	: [];

type ExtractPreHandlers<
	TKind extends HandlerKind,
	D extends Record<string, unknown>,
> = D[HandlerKindMap[TKind]["preHandlersKey"]] extends DefPreHandlerMap
	? D[HandlerKindMap[TKind]["preHandlersKey"]]
	: EmptyObject;

type ExtractForRootConfig<D extends Partial<WithForRootConfig>> =
	D["forRootConfig"] extends WithForRootConfig["forRootConfig"]
		? { forRootConfig: D["forRootConfig"] }
		: EmptyObject;

// ============================================================================
// ExtractDeps
// ============================================================================

type ExtractDeps<
	D extends {
		providers?: DefProviderMap;
		imports?: readonly ModuleImport[];
		queryHandlers?: readonly any[];
		commandHandlers?: readonly any[];
	},
> = ExtractProviders<D> &
	ExtractImportsExports<D> &
	ExtractQueryMediator<D> &
	ExtractCommandMediator<D> &
	CommonDependencies;

type ExtractImportsExports<D extends { imports?: readonly ModuleImport[] }> =
	D["imports"] extends readonly ModuleImport[]
		? ExtractExportsFromImports<D["imports"]>
		: DefProviderMap;

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

// ============================================================================
// Mediator Extraction
// ============================================================================

type MediatorHandlerKey = "queryHandlers" | "commandHandlers";
type MediatorPreHandlerKey = "queryPreHandlers" | "commandPreHandlers";

type MediatorKindMap = {
	query: {
		handlerKey: "queryHandlers";
		preHandlerKey: "queryPreHandlers";
		preHandlerExportsKey: "queryPreHandlerExports";
		mediatorKey: "queryMediator";
	};
	command: {
		handlerKey: "commandHandlers";
		preHandlerKey: "commandPreHandlers";
		preHandlerExportsKey: "commandPreHandlerExports";
		mediatorKey: "commandMediator";
	};
};

type ExtractQueryMediator<
	D extends {
		queryHandlers?: readonly any[];
		queryPreHandlers?: DefPreHandlerMap;
		imports?: readonly ModuleImport[];
	},
> = ExtractMediator<"query", D>;

type ExtractCommandMediator<
	D extends {
		commandHandlers?: readonly any[];
		commandPreHandlers?: DefPreHandlerMap;
		imports?: readonly ModuleImport[];
	},
> = ExtractMediator<"command", D>;

type ExtractMediator<
	TKind extends keyof MediatorKindMap,
	D extends Partial<Record<MediatorHandlerKey, readonly any[]>> &
		Partial<Record<MediatorPreHandlerKey, DefPreHandlerMap>> & {
			imports?: readonly ModuleImport[];
		},
> = D[MediatorKindMap[TKind]["handlerKey"]] extends readonly [any, ...any[]]
	? {
			[K in MediatorKindMap[TKind]["mediatorKey"]]: Mediator<
				ExtractContractsFromHandlers<D[MediatorKindMap[TKind]["handlerKey"]]>
			>;
		}
	: EmptyObject;

type ExtractContractsFromHandlers<Handlers extends readonly any[]> =
	Handlers extends readonly [infer First, ...infer Rest]
		? ExtractContractFromHandler<First> | ExtractContractsFromHandlers<Rest>
		: never;

type UnwrapClassHandler<H> = H extends ClassHandler ? H["useClass"] : H;

type ExtractContractFromHandler<H> =
	UnwrapClassHandler<H> extends new (
		...args: any[]
	) => infer I
		? I extends { contract: infer C }
			? C
			: never
		: UnwrapClassHandler<H> extends { contract: infer C }
			? C
			: never;
