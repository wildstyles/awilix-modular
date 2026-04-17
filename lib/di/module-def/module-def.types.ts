import type { EmptyObject, UnknownRecord } from "../common.types.js";
import type {
	ModuleImport,
	StaticModule,
	StaticModuleDef,
	WithForRootConfig,
} from "../module.types.js";
import type { DefPreHandlerMap, DefProviderMap } from "../provider.types.js";
import type {
	ExtractCommandContext,
	ExtractQueryContext,
} from "./extract-context.types.js";
import type {
	ExtractCommandMediator,
	ExtractQueryMediator,
} from "./extract-mediator.types.js";

export type {
	CommandScenario,
	QueryScenario,
	QueryScenarioInput,
} from "./handler-scenario.types.js";

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
	queryContext: ExtractQueryContext<D>;
	commandContext: ExtractCommandContext<D>;
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
