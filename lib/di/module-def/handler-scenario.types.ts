import type { HandlerExecuteScenario } from "../../mediator/handler.types.js";
import type { EmptyObject } from "../common.types.js";
import type {
	ModuleImport,
	StaticModule,
	StaticModuleDef,
} from "../module.types.js";
import type { DefPreHandlerMap } from "../provider.types.js";
import type { ExtractAvailablePreHandlerKeysByKind } from "./extract-mediator.types.js";

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

type PreHandlerExportKey =
	| "queryPreHandlerExports"
	| "commandPreHandlerExports";

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
	? ExtractExportedPreHandlersFromImports<
			Def["imports"],
			ScenarioKindMap[TKind]["preHandlerExportsKey"]
		>
	: EmptyObject;

type ExtractExportedPreHandlersFromImports<
	TImports extends readonly ModuleImport[],
	TExportKey extends PreHandlerExportKey,
> = TImports extends readonly [
	infer First,
	...infer Rest extends readonly ModuleImport[],
]
	? ExtractExportedPreHandlersFromModule<First, TExportKey> &
			ExtractExportedPreHandlersFromImports<Rest, TExportKey>
	: EmptyObject;

type ExtractExportedPreHandlersFromModule<
	TModule,
	TExportKey extends PreHandlerExportKey,
> = ExtractExportedPreHandlerMap<ExtractModuleDef<TModule>, TExportKey>;

type ExtractModuleDef<T> =
	T extends StaticModule<infer TDef extends StaticModuleDef>
		? TDef
		: T extends Record<string, unknown>
			? T
			: never;

type ExtractExportedPreHandlerMap<
	TModuleDef,
	TExportKey extends PreHandlerExportKey,
> = TModuleDef extends { [K in TExportKey]?: infer E }
	? [NonNullable<E>] extends [DefPreHandlerMap]
		? NonNullable<E>
		: EmptyObject
	: EmptyObject;

type ToPreHandlerMap<T> = [T] extends [DefPreHandlerMap] ? T : EmptyObject;

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
> = TScenario extends { includePreHandlers: infer Include extends readonly any[] }
	? Extract<Include[number], Extract<keyof TPreHandlerMap, string>>
	: Extract<keyof TPreHandlerMap, string>;

type ExtractExcludedPreHandlerKeys<
	TPreHandlerMap extends DefPreHandlerMap,
	TScenario,
> = TScenario extends { excludePreHandlers: infer Exclude extends readonly any[] }
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

type ExtractContextFromMiddleware<M> = ExtractContextFromContract<
	ExtractMiddlewareContract<M>
>;

type ExtractMiddlewareContract<M> = M extends { readonly contract: infer C }
	? C
	: M extends new (...args: any[]) => infer I
		? I extends { readonly contract: infer C }
			? C
			: never
		: M extends { useClass: infer U }
			? ExtractMiddlewareContract<U>
			: never;

type ExtractContextFromContract<T> =
	T extends Record<string, any>
		? T[keyof T] extends { returnType: infer R }
			? ExtractContextData<R>
			: never
		: never;

type ExtractContextData<T> = T extends
	| { readonly ok: true; readonly value: infer Data }
	| { readonly ok: false; readonly error: any }
	? Data extends Record<string, unknown>
		? Data
		: never
	: T extends Record<string, unknown>
		? T
		: never;

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
	k: infer I,
) => void
	? I
	: never;
