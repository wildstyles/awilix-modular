import type { BuildResolverOptions } from "awilix";
import type { Handler } from "./cqrs.types.ts";

// ============================================================================
// Base Type Definitions
// ============================================================================
// https://github.com/sindresorhus/type-fest/blob/main/source/empty-object.d.ts
declare const emptyObjectSymbol: unique symbol;
export type EmptyObject = { [emptyObjectSymbol]?: never };
type UnknownRecord = Record<PropertyKey, unknown>;

type Constructor<T, Arguments extends unknown[] = any[]> = new (
	...arguments_: Arguments
) => T;

/**
 * Common dependencies available to all modules.
 * Can be extended via declaration merging in consuming projects.
 *
 * @example
 * ```ts
 * declare module "awilix-modular" {
 *   interface CommonDependencies {
 *     config: EnvConfig;
 *     logger: Logger;
 *   }
 * }
 * ```
 */
// biome-ignore lint/suspicious/noEmptyInterface: Intentionally empty for declaration merging
export interface CommonDependencies {}

type ToProviderMap<
	T extends ProviderMap,
	DepsMap extends Record<string, unknown> = Record<string, unknown>,
> = [keyof T] extends [never]
	? EmptyObject
	: {
			[K in keyof T]: T[K] extends object ? Provider<T[K], DepsMap> : T[K]; // Primitives pass through directly
		};

type ProviderMap = Record<string, object | string | boolean | number>;

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
	provide: ClassProvider<T> | ConstructorProvider<T>;
	inject?: Keys;
	useFactory: Strict extends true
		? (...args: MapKeysToValues<DepsMap, Keys>) => T
		: (...args: any[]) => T;
};

type ClassProvider<T extends object> = {
	useClass: Constructor<T>;
} & BuildResolverOptions<T>;

type ConstructorProvider<T extends object = object> = Constructor<T>;

type PrimitiveProvider = string | number | boolean | symbol | bigint;

type Provider<
	T extends object,
	DepsMap extends Record<string, unknown> = Record<string, unknown>,
> =
	| FactoryProvider<T, DepsMap, readonly (keyof DepsMap)[], false>
	| ClassProvider<T>
	| ConstructorProvider<T>;

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

type ResolveImports<D extends { imports?: readonly AnyModule[] }> =
	D["imports"] extends readonly AnyModule[] ? D["imports"] : [];

type ExtractModuleDefFromModule<T> =
	T extends StaticModule<infer TDef extends BaseModuleDef> ? TDef : never;

type ExtractExportsFromImports<T extends readonly AnyModule[]> =
	T extends readonly [infer First, ...infer Rest extends readonly AnyModule[]]
		? ExtractModuleDefFromModule<First> extends { exports: infer E }
			? E & ExtractExportsFromImports<Rest>
			: ExtractExportsFromImports<Rest>
		: EmptyObject;

type ResolveDeps<
	D extends {
		providers?: ProviderMap;
		imports?: readonly AnyModule[];
	},
> = ResolveProviders<D> &
	(D["imports"] extends readonly AnyModule[]
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
		imports?: readonly AnyModule[];
		forRootConfig?: UnknownRecord;
	},
> = {
	providers: ResolveProviders<D>;
	exports: ResolveExports<D>;
	imports: ResolveImports<D>;
	deps: ResolveDeps<D>;
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

export type HandlerConstructor = Constructor<Handler<any, string>>;

export type ControllerConstructor<TFramework = unknown> = Constructor<
	Controller<TFramework>
>;

export interface Controller<TFramework = unknown> {
	registerRoutes: (framework: TFramework) => void;
}

type WithProviders<Def extends StaticModuleDef> =
	Def["providers"] extends EmptyObject
		? { providers?: ToProviderMap<Def["providers"], ExtractDeps<Def>> }
		: { providers: ToProviderMap<Def["providers"], ExtractDeps<Def>> };

type WithExports<Def extends StaticModuleDef> =
	Def["exports"] extends EmptyObject
		? { exports?: ToProviderMap<Def["exports"], ExtractDeps<Def>> }
		: { exports: ToProviderMap<Def["exports"], ExtractDeps<Def>> };

type WithImports<Def extends StaticModuleDef> = 0 extends 1 & Def
	? { imports?: StaticModule<any>[] } // Def is 'any' - use loose typing
	: Def["imports"] extends []
		? { imports?: [] }
		: { imports: Def["imports"] };

export type AnyModule = StaticModule<any>;

export type StaticModule<Def extends StaticModuleDef> = {
	name: string;
	queryHandlers?: HandlerConstructor[];
	controllers?: ControllerConstructor<any>[];
	providerOptions?: Partial<BuildResolverOptions<any>>;
} & WithProviders<Def> &
	WithExports<Def> &
	WithImports<Def>;

type DynamicModuleOptions = {
	registerControllers?: boolean;
};

type DynamicModule<TDef extends DynamicModuleDef> = {
	forRoot(
		config: TDef["forRootConfig"],
		options?: DynamicModuleOptions,
	): StaticModule<TDef>;
};

export type Module<TDef extends BaseModuleDef & Partial<WithForRootConfig>> =
	TDef extends WithForRootConfig ? DynamicModule<TDef> : StaticModule<TDef>;

// ===========================================================================
// Narrow type checks
// ===========================================================================
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

export function isCostructorProvider<T extends object>(
	provider: unknown,
): provider is ConstructorProvider<T> {
	return typeof provider === "function" && "prototype" in provider;
}

export function isPrimitive(provider: unknown): provider is PrimitiveProvider {
	return (
		typeof provider === "string" ||
		typeof provider === "number" ||
		typeof provider === "boolean" ||
		typeof provider === "symbol" ||
		typeof provider === "bigint"
	);
}

export function createFactoryProvider<DepsMap extends Record<string, any>>() {
	return <T extends object, const Keys extends readonly (keyof DepsMap)[]>(
		provider: FactoryProvider<T, DepsMap, Keys>,
	): FactoryProvider<T, DepsMap, Keys> => {
		return provider;
	};
}
