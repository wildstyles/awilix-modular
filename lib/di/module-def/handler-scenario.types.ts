import type { HandlerExecuteScenario } from "../../mediator/handler.types.js";
import type { EmptyObject, UnionToIntersection } from "../common.types.js";
import type { ModuleImport } from "../module.types.js";
import type { DefPreHandlerMap } from "../provider.types.js";
import type { ExtractAvailablePreHandlerKeysByKind } from "./extract-mediator.types.js";
import type {
	ExtractContextFromMiddleware,
	ExtractPreHandlerMapFromImports,
	ToPreHandlerMap,
} from "./shared-utilities.types.js";

type ScenarioModuleDef = {
	imports?: readonly ModuleImport[];
	queryPreHandlers?: DefPreHandlerMap;
	commandPreHandlers?: DefPreHandlerMap;
	queryContext?: Record<string, unknown>;
	commandContext?: Record<string, unknown>;
};

type ScenarioKind = "query" | "command";
type ScenarioKindMap = {
	query: {
		preHandlersKey: "queryPreHandlers";
		preHandlerExportsKey: "queryPreHandlerExports";
		contextKey: "queryContext";
	};
	command: {
		preHandlersKey: "commandPreHandlers";
		preHandlerExportsKey: "commandPreHandlerExports";
		contextKey: "commandContext";
	};
};

type BaseScenarioInputForKind<
	Def extends ScenarioModuleDef,
	TKind extends ScenarioKind,
> = HandlerExecuteScenario<
	string,
	readonly ExtractAvailablePreHandlerKeysByKind<TKind, Def>[] | undefined,
	readonly ExtractAvailablePreHandlerKeysByKind<TKind, Def>[] | undefined
>;

export type QueryScenarioInput<Def extends ScenarioModuleDef> =
	BaseScenarioInputForKind<Def, "query">;

export type CommandScenarioInput<Def extends ScenarioModuleDef> =
	BaseScenarioInputForKind<Def, "command">;

export type QueryScenarioContext<
	Def extends ScenarioModuleDef,
	TScenario extends QueryScenarioInput<Def>,
> = ExtractScenarioContextByKind<Def, "query", TScenario>;

export type CommandScenarioContext<
	Def extends ScenarioModuleDef,
	TScenario extends CommandScenarioInput<Def>,
> = ExtractScenarioContextByKind<Def, "command", TScenario>;

export type QueryScenario<
	Def extends ScenarioModuleDef,
	TScenario extends QueryScenarioInput<Def>,
> = TScenario & { readonly context: QueryScenarioContext<Def, TScenario> };

export type CommandScenario<
	Def extends ScenarioModuleDef,
	TScenario extends CommandScenarioInput<Def>,
> = TScenario & { readonly context: CommandScenarioContext<Def, TScenario> };

type ExtractScenarioContextByKind<
	Def extends ScenarioModuleDef,
	TKind extends ScenarioKind,
	TScenario extends BaseScenarioInputForKind<Def, TKind>,
> = ContextFromSelectedPreHandlers<
	ExtractAvailablePreHandlerMapByKind<Def, TKind>,
	ExtractSelectedPreHandlerKeys<
		ExtractAvailablePreHandlerMapByKind<Def, TKind>,
		TScenario
	>
>;

type ExtractAvailablePreHandlerMapByKind<
	Def extends ScenarioModuleDef,
	TKind extends ScenarioKind,
> = ToPreHandlerMap<
	ExtractLocalPreHandlerMapByKind<Def, TKind> &
		ExtractExportedPreHandlersFromImportsByKind<Def, TKind>
>;

type ExtractLocalPreHandlerMapByKind<
	Def extends ScenarioModuleDef,
	TKind extends ScenarioKind,
> = Def[ScenarioKindMap[TKind]["preHandlersKey"]] extends DefPreHandlerMap
	? Def[ScenarioKindMap[TKind]["preHandlersKey"]]
	: EmptyObject;

type ExtractExportedPreHandlersFromImportsByKind<
	Def extends ScenarioModuleDef,
	TKind extends ScenarioKind,
> = Def["imports"] extends readonly ModuleImport[]
	? ExtractPreHandlerMapFromImports<
			Def["imports"],
			ScenarioKindMap[TKind]["preHandlerExportsKey"]
		>
	: EmptyObject;

type ExtractSelectedPreHandlerKeys<
	TPreHandlerMap extends DefPreHandlerMap,
	TScenario,
> = Exclude<
	ExtractIncludedPreHandlerKeys<TPreHandlerMap, TScenario>,
	ExtractExcludedPreHandlerKeys<TPreHandlerMap, TScenario>
>;

type ExtractIncludedPreHandlerKeys<
	TPreHandlerMap extends DefPreHandlerMap,
	TScenario,
> = TScenario extends {
	includePreHandlers: infer Include extends readonly any[];
}
	? Extract<Include[number], Extract<keyof TPreHandlerMap, string>>
	: Extract<keyof TPreHandlerMap, string>;

type ExtractExcludedPreHandlerKeys<
	TPreHandlerMap extends DefPreHandlerMap,
	TScenario,
> = TScenario extends {
	excludePreHandlers: infer Exclude extends readonly any[];
}
	? Extract<Exclude[number], Extract<keyof TPreHandlerMap, string>>
	: never;

type ContextFromSelectedPreHandlers<
	TPreHandlerMap extends DefPreHandlerMap,
	TSelectedKey extends Extract<keyof TPreHandlerMap, string>,
> = [TSelectedKey] extends [never]
	? EmptyObject
	: UnionToIntersection<
			{
				[K in TSelectedKey]: ExtractContextFromMiddleware<TPreHandlerMap[K]>;
			}[TSelectedKey]
		>;
