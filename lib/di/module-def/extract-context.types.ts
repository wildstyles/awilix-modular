import type { EmptyObject, UnionToIntersection } from "../common.types.js";
import type { ModuleImport } from "../module.types.js";
import type { DefPreHandlerMap } from "../provider.types.js";
import type {
	ExtractContextFromMiddleware,
	ExtractExportedPreHandlers,
	ExtractModuleDef,
	PreHandlerExportKey,
} from "./shared-utilities.types.js";

type PreHandlerLocalKey = "queryPreHandlers" | "commandPreHandlers";
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
> = (D[TLocalKey] extends DefPreHandlerMap
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

type ContextFromMiddlewareMap<Map> = [Map] extends [DefPreHandlerMap]
	? keyof Map extends never
		? EmptyObject
		: UnionToIntersection<
				{
					[K in keyof Map]: ExtractContextFromMiddleware<Map[K]>;
				}[keyof Map]
			>
	: EmptyObject;
