import type { BuildResolverOptions, Resolver } from "awilix";
import type { Handler } from "./cqrs.types.ts";

// ============================================================================
// Base Type Definitions
// ============================================================================
// https://github.com/sindresorhus/type-fest/blob/main/source/empty-object.d.ts
declare const emptyObjectSymbol: unique symbol;
type EmptyObject = { [emptyObjectSymbol]?: never };
type UnknownRecord = Record<PropertyKey, unknown>;

export type MandatoryNameAndRegistrationPair<T> = {
	[U in keyof T]: Resolver<T[U]>;
};

type ToResolverProviderMap<
	T extends ProviderMap,
	DepsMap extends Record<string, unknown> = Record<string, unknown>,
> = [keyof T] extends [never]
	? EmptyObject
	: {
			[K in keyof T]: Provider<T[K], DepsMap>;
		};

// TODO: make any class constructor instead of object
type ProviderMap = Record<string, object>;

export type AnyModule = StaticModule<ModuleDef<any>>;

// Helper type to map dependency keys to their actual types
type MapKeysToValues<
	DepsMap extends Record<string, unknown>,
	Keys extends readonly (keyof DepsMap)[],
> = {
	[K in keyof Keys]: Keys[K] extends keyof DepsMap ? DepsMap[Keys[K]] : never;
};

type FactoryProvider<
	T extends object,
	DepsMap extends Record<string, unknown>,
	Keys extends readonly (keyof DepsMap)[],
	Strict extends boolean = true,
> = {
	provide: Resolver<T>;
	inject?: Keys;
	useFactory: Strict extends true
		? (...args: MapKeysToValues<DepsMap, Keys>) => T
		: (...args: any[]) => T;
};

type ClassProvider<T extends object> = {
	useClass: new (...args: any[]) => T;
} & BuildResolverOptions<T>;

type ClassConstructor<T extends object = object> = new (...args: any[]) => T;

type Provider<
	T extends object,
	DepsMap extends Record<string, unknown> = Record<string, unknown>,
> =
	| Resolver<T>
	| FactoryProvider<T, DepsMap, readonly (keyof DepsMap)[], false>
	| ClassProvider<T>
	| ClassConstructor<T>;

// ============================================================================
// Typed module definition with deps
// ============================================================================

type ResolveProviders<D extends { providers?: ProviderMap }> =
	D["providers"] extends ProviderMap ? D["providers"] : EmptyObject;

type ResolveExports<
	D extends {
		providers?: ProviderMap;
		exportKeys?: keyof NonNullable<D["providers"]>;
	},
> = D["providers"] extends ProviderMap
	? D["exportKeys"] extends keyof D["providers"]
		? Pick<D["providers"], D["exportKeys"]>
		: EmptyObject
	: EmptyObject;

type ResolveImports<D extends { imports?: AnyModule[] }> =
	D["imports"] extends AnyModule[] ? D["imports"] : [];

type ExtractModuleDefFromModule<T> =
	T extends StaticModule<infer TDef> ? TDef : never;

type ExtractExportsFromImports<T extends AnyModule[]> = T extends [
	infer First,
	...infer Rest extends AnyModule[],
]
	? ExtractModuleDefFromModule<First> extends { exports: infer E }
		? E & ExtractExportsFromImports<Rest>
		: ExtractExportsFromImports<Rest>
	: EmptyObject;

type ResolveDeps<
	D extends {
		providers?: ProviderMap;
		imports?: AnyModule[];
	},
	CommonDependencies extends UnknownRecord,
> = ResolveProviders<D> &
	(D["imports"] extends AnyModule[]
		? ExtractExportsFromImports<D["imports"]>
		: ProviderMap) &
	CommonDependencies;

type ResolveForRootConfig<D extends Partial<WithForRootConfig>> =
	D["forRootConfig"] extends WithForRootConfig["forRootConfig"]
		? { forRootConfig: D["forRootConfig"] }
		: EmptyObject;

export type ModuleDef<
	D extends {
		providers?: ProviderMap;
		exportKeys?: D["providers"] extends ProviderMap
			? keyof D["providers"]
			: never;
		imports?: AnyModule[];
		forRootConfig?: UnknownRecord;
	},
	CommonDependencies extends UnknownRecord = UnknownRecord,
> = {
	providers: ResolveProviders<D>;
	exports: ResolveExports<D>;
	imports: ResolveImports<D>;
	deps: ResolveDeps<D, CommonDependencies>;
} & ResolveForRootConfig<D>;

export type ExtractModuleDef<T> = T extends {
	forRoot: (...args: any[]) => infer R;
}
	? R
	: T extends AnyModule
		? T
		: never;

// ============================================================================
// Concrete module definition based on typed definition
// ============================================================================

type BaseModuleDef = {
	providers: ProviderMap;
	exports: ProviderMap;
	imports: AnyModule[];
};

type WithForRootConfig = {
	forRootConfig: UnknownRecord;
};

type StaticModuleDef = BaseModuleDef;
type DynamicModuleDef = BaseModuleDef & WithForRootConfig;

type ExtractDeps<Def> = Def extends {
	deps: infer D;
}
	? D
	: Record<string, unknown>;

export type HandlerConstructor = {
	new (...args: any[]): Handler<any>;
};

export type ControllerConstructor<TFramework = unknown> = {
	new (...args: any[]): Controller<TFramework>;
};

export interface Controller<TFramework = unknown> {
	registerRoutes: (framework: TFramework) => void;
}

export type StaticModule<Def extends StaticModuleDef> = {
	name: string;
	imports: Def["imports"] extends AnyModule[]
		? readonly [...Def["imports"]]
		: readonly [];
	providers: ToResolverProviderMap<Def["providers"], ExtractDeps<Def>>;
	exports: ToResolverProviderMap<Def["exports"], ExtractDeps<Def>>;
	queryHandlers?: HandlerConstructor[];
	controllers?: ControllerConstructor<any>[];
	providerOptions?: Partial<BuildResolverOptions<any>>;
};

type DynamicModule<TDef extends DynamicModuleDef> = {
	forRoot(config: TDef["forRootConfig"]): StaticModule<TDef>;
};

export type Module<TDef extends BaseModuleDef & Partial<WithForRootConfig>> =
	TDef extends WithForRootConfig ? DynamicModule<TDef> : StaticModule<TDef>;

// ============================================================================
// Narrow type checks
// ============================================================================
//

export function isFactoryProvider<T extends object>(
	provider: unknown,
): provider is FactoryProvider<T, any, readonly string[], false> {
	return (
		typeof provider === "object" &&
		provider !== null &&
		"useFactory" in provider
	);
}

export function isClassProvider<T extends object>(
	provider: unknown,
): provider is ClassProvider<T> {
	return (
		typeof provider === "object" && provider !== null && "useClass" in provider
	);
}

export function isClassConstructor<T extends object>(
	provider: unknown,
): provider is ClassConstructor<T> {
	return typeof provider === "function" && "prototype" in provider;
}

export function isResolver<T extends object>(
	provider: unknown,
): provider is Resolver<T> {
	return (
		typeof provider === "object" && provider !== null && "resolve" in provider
	);
}

export function createFactoryProvider<DepsMap extends Record<string, any>>() {
	return <T extends object, const Keys extends readonly (keyof DepsMap)[]>(
		provider: FactoryProvider<T, DepsMap, Keys>,
	): FactoryProvider<T, DepsMap, Keys> => {
		return provider;
	};
}
