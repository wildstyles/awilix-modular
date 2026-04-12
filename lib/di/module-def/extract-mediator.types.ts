import type { Mediator } from "../../mediator/mediator.js";
import type { EmptyObject } from "../common.types.js";
import type {
	ModuleImport,
	StaticModule,
	StaticModuleDef,
} from "../module.types.js";
import type { ClassHandler, DefPreHandlerMap } from "../provider.types.js";

type HandlerKey = "queryHandlers" | "commandHandlers";
type PreHandlerKey = "queryPreHandlers" | "commandPreHandlers";

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

export type ExtractQueryMediator<
	D extends {
		queryHandlers?: readonly any[];
		queryPreHandlers?: DefPreHandlerMap;
		imports?: readonly ModuleImport[];
	},
> = ExtractMediator<"query", D>;

export type ExtractCommandMediator<
	D extends {
		commandHandlers?: readonly any[];
		commandPreHandlers?: DefPreHandlerMap;
		imports?: readonly ModuleImport[];
	},
> = ExtractMediator<"command", D>;

type ExtractMediator<
	TKind extends keyof MediatorKindMap,
	D extends Partial<Record<HandlerKey, readonly any[]>> &
		Partial<Record<PreHandlerKey, DefPreHandlerMap>> & {
			imports?: readonly ModuleImport[];
		},
> = D[MediatorKindMap[TKind]["handlerKey"]] extends readonly [any, ...any[]]
	? {
			[K in MediatorKindMap[TKind]["mediatorKey"]]: Mediator<
				AttachPreHandlerErrorMapToContracts<
					ExtractContractsFromHandlers<D[MediatorKindMap[TKind]["handlerKey"]]>,
					ExtractPreHandlerErrorMapByKind<TKind, D>
				>,
				ExtractAvailablePreHandlerKeysByKind<TKind, D>,
				ExtractPreHandlerErrorMapByKind<TKind, D>
			>;
		}
	: EmptyObject;

type AttachPreHandlerErrorMapToContracts<TContracts, TPreHandlerErrorMap> = {
	[K in keyof TContracts]: TContracts[K] extends {
		payload: infer P;
		response: infer R;
	}
		? {
				payload: P;
				response: R;
			} & (TContracts[K] extends { executeScenarios: infer S }
				? { executeScenarios: S }
				: EmptyObject) &
				([TPreHandlerErrorMap] extends [EmptyObject]
					? EmptyObject
					: { preHandlerErrors: TPreHandlerErrorMap })
		: never;
};

type ExtractContractsFromHandlers<Handlers extends readonly any[]> =
	Handlers extends readonly [infer First, ...infer Rest]
		? ExtractContractFromHandler<First> & ExtractContractsFromHandlers<Rest>
		: EmptyObject;

type UnwrapClassHandler<H> = H extends ClassHandler ? H["useClass"] : H;

type ExtractContractFromHandler<H> = UnwrapClassHandler<H> extends new (
	...args: any[]
) => infer I
	? I extends { contract: infer C }
		? AttachExecuteScenariosToContract<C, ExtractExecuteScenariosFromHandler<I>>
		: never
	: UnwrapClassHandler<H> extends { contract: infer C }
	? AttachExecuteScenariosToContract<
			C,
			ExtractExecuteScenariosFromHandler<UnwrapClassHandler<H>>
		>
	: never;

type ExtractExecuteScenariosFromHandler<H> = H extends {
	executeScenarios: infer S;
}
	? S
	: never;

type AttachExecuteScenariosToContract<TContract, TScenarios> = [TScenarios] extends [
	never,
]
	? TContract
	: TContract extends Record<string, any>
		? {
				[K in keyof TContract]: TContract[K] & { executeScenarios: TScenarios };
			}
			: never
	;

type ExtractAvailablePreHandlerMapByKind<
	TKind extends keyof MediatorKindMap,
	D extends Partial<Record<PreHandlerKey, DefPreHandlerMap>> & {
		imports?: readonly ModuleImport[];
	},
> = ToPreHandlerMap<
	ExtractLocalPreHandlerMapByKind<TKind, D> &
		ExtractExportedPreHandlerMapFromImports<
			D["imports"],
			MediatorKindMap[TKind]["preHandlerExportsKey"]
		>
>;

type ExtractLocalPreHandlerMapByKind<
	TKind extends keyof MediatorKindMap,
	D extends Partial<Record<PreHandlerKey, DefPreHandlerMap>>,
> = D[MediatorKindMap[TKind]["preHandlerKey"]] extends DefPreHandlerMap
	? D[MediatorKindMap[TKind]["preHandlerKey"]]
	: EmptyObject;

type ExtractPreHandlerErrorMapByKind<
	TKind extends keyof MediatorKindMap,
	D extends Partial<Record<PreHandlerKey, DefPreHandlerMap>> & {
		imports?: readonly ModuleImport[];
	},
> = ErrorsByPreHandlerFromMiddlewareMap<
	ExtractAvailablePreHandlerMapByKind<TKind, D>
>;

// ============================================================================
// preHandler key extraction for .execute configuration
// ============================================================================

type ExtractPreHandlerKeys<TPreHandlers> = TPreHandlers extends DefPreHandlerMap
	? Extract<keyof TPreHandlers, string>
	: never;

type PreHandlerExportKey =
	| "queryPreHandlerExports"
	| "commandPreHandlerExports";

export type ExtractAvailablePreHandlerKeysByKind<
	TKind extends keyof MediatorKindMap,
	D extends Partial<Record<PreHandlerKey, DefPreHandlerMap>> & {
		imports?: readonly ModuleImport[];
	},
> =
	| ExtractPreHandlerKeys<D[MediatorKindMap[TKind]["preHandlerKey"]]>
	| (D["imports"] extends readonly ModuleImport[]
			? ExtractExportedPreHandlerKeysFromImports<
					D["imports"],
					MediatorKindMap[TKind]["preHandlerExportsKey"]
				>
			: never);

type ExtractExportedPreHandlerKeysFromImports<
	TImports extends readonly ModuleImport[],
	TExportKey extends PreHandlerExportKey,
> = TImports extends readonly [
	infer First,
	...infer Rest extends readonly ModuleImport[],
]
	?
			| ExtractPreHandlerKeys<
					ExtractExportedPreHandlers<ExtractModuleDef<First>, TExportKey>
			  >
			| ExtractExportedPreHandlerKeysFromImports<Rest, TExportKey>
	: never;

type ExtractModuleDef<T> =
	T extends StaticModule<infer TDef extends StaticModuleDef>
		? TDef
		: T extends Record<string, unknown>
			? T
			: never;

type ExtractExportedPreHandlers<
	TModuleDef,
	TExportKey extends PreHandlerExportKey,
> = TModuleDef extends { [K in TExportKey]?: infer E }
	? [NonNullable<E>] extends [EmptyObject]
		? never
		: [NonNullable<E>] extends [DefPreHandlerMap]
			? NonNullable<E>
			: never
	: never;

type ExtractExportedPreHandlerMapFromImports<
	TImports extends readonly ModuleImport[] | undefined,
	TExportKey extends PreHandlerExportKey,
> = TImports extends readonly [
	infer First,
	...infer Rest extends readonly ModuleImport[],
]
	? ExtractExportedPreHandlerMap<ExtractModuleDef<First>, TExportKey> &
			ExtractExportedPreHandlerMapFromImports<Rest, TExportKey>
	: EmptyObject;

type ExtractExportedPreHandlerMap<
	TModuleDef,
	TExportKey extends PreHandlerExportKey,
> = TModuleDef extends { [K in TExportKey]?: infer E }
	? [NonNullable<E>] extends [DefPreHandlerMap]
		? NonNullable<E>
		: EmptyObject
	: EmptyObject;

type ToPreHandlerMap<T> = [T] extends [DefPreHandlerMap] ? T : EmptyObject;

// ============================================================================
//
// ============================================================================

type ErrorsByPreHandlerFromMiddlewareMap<Map> = Map extends DefPreHandlerMap
	? Extract<keyof Map, string> extends never
		? EmptyObject
		: {
				[K in Extract<keyof Map, string>]: ExtractErrorFromMiddleware<Map[K]>;
			}
	: never;

type ExtractErrorFromMiddleware<M> = ExtractContextErrorFromContract<
	ExtractMiddlewareContract<M>
>;

type ExtractContextErrorFromContract<T> =
	T extends Record<string, any>
		? T[keyof T] extends { returnType: infer R }
			? ExtractResultError<R>
			: never
		: never;

type ExtractMiddlewareContract<M> = M extends {
	readonly contract: infer C;
}
	? C
	: M extends { useClass: { readonly contract: infer C } }
		? C
		: never;

type ExtractResultError<T> = T extends {
	readonly ok: false;
	readonly error: infer E;
}
	? E
	: never;
