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

type ToModuleProviderMap<
	T extends DefProviderMap,
	DepsMap extends Record<string, unknown> = Record<string, unknown>,
> = [keyof T] extends [never]
	? EmptyObject
	: {
			[K in keyof T]: T[K] extends object ? Provider<T[K], DepsMap> : T[K]; // Primitives pass through directly
		};

type DefProviderMap = Record<string, object | string | boolean | number>;

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

type ResolveImports<D extends { imports?: readonly AnyModule[] }> =
	D["imports"] extends readonly AnyModule[] ? D["imports"] : [];

type ExtractModuleDefFromModule<T> =
	T extends StaticModule<infer TDef extends StaticModuleDef> ? TDef : never;

type ExtractExportsFromImports<T extends readonly AnyModule[]> =
	T extends readonly [infer First, ...infer Rest extends readonly AnyModule[]]
		? ExtractModuleDefFromModule<First> extends { exports: infer E }
			? E & ExtractExportsFromImports<Rest>
			: ExtractExportsFromImports<Rest>
		: EmptyObject;

type ResolveDeps<
	D extends {
		providers?: DefProviderMap;
		imports?: readonly AnyModule[];
	},
> = ResolveProviders<D> &
	(D["imports"] extends readonly AnyModule[]
		? ExtractExportsFromImports<D["imports"]>
		: DefProviderMap) &
	CommonDependencies;

type ResolveForRootConfig<D extends Partial<WithForRootConfig>> =
	D["forRootConfig"] extends WithForRootConfig["forRootConfig"]
		? { forRootConfig: D["forRootConfig"] }
		: EmptyObject;

export type ModuleDef<
	D extends {
		providers?: DefProviderMap;
		exportKeys?: D["providers"] extends DefProviderMap
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

type WithForRootConfig = {
	forRootConfig: UnknownRecord;
};

type StaticModuleDef = {
	providers?: DefProviderMap;
	exports?: DefProviderMap;
	imports?: AnyModule[];
};
type DynamicModuleDef = StaticModuleDef & WithForRootConfig;

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
	Def["providers"] extends DefProviderMap
		? Def["providers"] extends EmptyObject
			? { providers?: ToModuleProviderMap<Def["providers"], ExtractDeps<Def>> }
			: { providers: ToModuleProviderMap<Def["providers"], ExtractDeps<Def>> }
		: { providers?: never };

type WithExports<Def extends StaticModuleDef> =
	Def["exports"] extends DefProviderMap
		? Def["exports"] extends EmptyObject
			? { exports?: ToModuleProviderMap<Def["exports"], ExtractDeps<Def>> }
			: { exports: ToModuleProviderMap<Def["exports"], ExtractDeps<Def>> }
		: { exports?: never };

type WithImports<Def extends StaticModuleDef> = 0 extends 1 & Def
	? { imports?: StaticModule<any>[] } // Def is 'any' - use loose typing
	: Def["imports"] extends AnyModule[]
		? Def["imports"] extends []
			? { imports?: [] }
			: { imports: Def["imports"] }
		: { imports?: never };

export type AnyModule = StaticModule<any>;

export type StaticModule<Def extends StaticModuleDef> = {
	name: string;
	queryHandlers?: HandlerConstructor[];
	controllers?: ControllerConstructor<any>[];
	providerOptions?: Partial<BuildResolverOptions<any>>;
} & WithProviders<Def> &
	WithExports<Def> &
	WithImports<Def>;

export type DynamicModuleOptions = {
	registerControllers?: boolean;
};

export type DynamicModule<TDef extends DynamicModuleDef> = {
	forRoot(
		config: TDef["forRootConfig"],
		options?: DynamicModuleOptions,
	): StaticModule<TDef>;
};

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

export function createStaticModule<TDef extends StaticModuleDef>(
	module: StaticModule<TDef>,
): StaticModule<TDef> {
	return module;
}

export function createDynamicModule<TDef extends DynamicModuleDef>(
	factory: (
		config: TDef["forRootConfig"],
		options?: DynamicModuleOptions,
	) => StaticModule<TDef>,
): DynamicModule<TDef> {
	return {
		forRoot(config, options) {
			return factory(config, options);
		},
	};
}
