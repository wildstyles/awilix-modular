import type { EmptyObject } from "../common.types.js";
import type {
	ModuleImport,
	StaticModule,
	StaticModuleDef,
} from "../module.types.js";
import type { DefPreHandlerMap } from "../provider.types.js";

type PreHandlerLocalKey = "queryPreHandlers" | "commandPreHandlers";
type PreHandlerExportKey =
	| "queryPreHandlerExports"
	| "commandPreHandlerExports";
type ContextKey = "queryContext" | "commandContext";

export type ExtractQueryContext<
	D extends {
		queryPreHandlers?: DefPreHandlerMap;
		imports?: readonly ModuleImport[];
		queryContext?: Record<string, unknown>;
	},
> = ExtractContext<
	"queryPreHandlers",
	"queryPreHandlerExports",
	"queryContext",
	D
>;

export type ExtractCommandContext<
	D extends {
		commandPreHandlers?: DefPreHandlerMap;
		imports?: readonly ModuleImport[];
		commandContext?: Record<string, unknown>;
	},
> = ExtractContext<
	"commandPreHandlers",
	"commandPreHandlerExports",
	"commandContext",
	D
>;

type ExtractContext<
	TLocalKey extends PreHandlerLocalKey,
	TExportKey extends PreHandlerExportKey,
	TContextKey extends ContextKey,
	D extends { imports?: readonly ModuleImport[] } & Partial<
		Record<TLocalKey | TContextKey, DefPreHandlerMap | Record<string, unknown>>
	>,
> = (D[TContextKey] extends Record<string, unknown>
	? D[TContextKey]
	: EmptyObject) &
	(D[TLocalKey] extends DefPreHandlerMap
	? ContextFromMiddlewareMap<D[TLocalKey]>
	: EmptyObject) &
	(D["imports"] extends readonly ModuleImport[]
		? ExtractContextFromImports<D["imports"], TExportKey>
		: EmptyObject);

type ExtractContextFromImports<
	TImports extends readonly ModuleImport[],
	TExportKey extends PreHandlerExportKey,
> = TImports extends readonly [
	infer First,
	...infer Rest extends readonly ModuleImport[],
]
	? ContextFromMiddlewareMap<
			ExtractExportedPreHandlers<ExtractModuleDef<First>, TExportKey>
		> &
			ExtractContextFromImports<Rest, TExportKey>
	: EmptyObject;

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

type ExtractMiddlewareContract<M> = M extends { readonly contract: infer C }
	? C
	: M extends { useClass: { readonly contract: infer C } }
		? C
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

type ContextFromMiddlewareMap<Map> = [Map] extends [DefPreHandlerMap]
	? keyof Map extends never
		? EmptyObject
		: UnionToIntersection<
				{
					[K in keyof Map]: ExtractContextFromMiddleware<Map[K]>;
				}[keyof Map]
			>
	: EmptyObject;

type ExtractContextFromMiddleware<M> = ExtractContextFromContract<
	ExtractMiddlewareContract<M>
>;

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
	k: infer I,
) => void
	? I
	: never;
