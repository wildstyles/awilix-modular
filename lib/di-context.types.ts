import { Resolver } from "awilix";

type CommonDependencies = {};

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    : // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (...args: any[]) => T;
};

type Provider<
  T extends object,
  DepsMap extends Record<string, unknown> = Record<string, unknown>,
> =
  | Resolver<T>
  | FactoryProvider<T, DepsMap, readonly (keyof DepsMap)[], false>;

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
> = {
  providers: ResolveProviders<D>;
  exports: ResolveExports<D>;
  imports: ResolveImports<D>;
  deps: ResolveDeps<D>;
} & ResolveForRootConfig<D>;

export type ExtractModuleDef<T> = T extends {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

export type StaticModule<Def extends StaticModuleDef> = {
  name: string;
  imports: Def["imports"] extends AnyModule[]
    ? readonly [...Def["imports"]]
    : readonly [];
  providers: ToResolverProviderMap<Def["providers"], ExtractDeps<Def>>;
  exports: ToResolverProviderMap<Def["exports"], ExtractDeps<Def>>;
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): provider is FactoryProvider<T, any, readonly string[], false> {
  return (
    typeof provider === "object" &&
    provider !== null &&
    "useFactory" in provider
  );
}

export function isResolver<T extends object>(
  provider: unknown,
): provider is Resolver<T> {
  return (
    typeof provider === "object" && provider !== null && "resolve" in provider
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createFactoryProvider<DepsMap extends Record<string, any>>() {
  return <T extends object, const Keys extends readonly (keyof DepsMap)[]>(
    provider: FactoryProvider<T, DepsMap, Keys>,
  ): FactoryProvider<T, DepsMap, Keys> => {
    return provider;
  };
}
