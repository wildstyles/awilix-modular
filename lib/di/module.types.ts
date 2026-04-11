import type { BuildResolverOptions } from "awilix";
import type { EmptyObject, UnknownRecord } from "./common.types.js";
import type { ForwardRef, ModuleRef } from "./module-ref.types.js";
import type {
	AnyController,
	ClassHandler,
	ConstructorHandler,
	DefProviderMap,
	Provider,
} from "./provider.types.js";

// ============================================================================
// Module Definition Types
// ============================================================================

export type AnyModule = StaticModule<any> & DynamicModuleOptions;
export type ModuleImport = AnyModule | ModuleRef<any>;

export type StaticModuleDef = {
	providers?: DefProviderMap;
	exports?: DefProviderMap;
	imports?: ModuleImport[];
	queryHandlers: readonly any[];
	commandHandlers: readonly any[];
};

export type DynamicModuleDef = StaticModuleDef & WithForRootConfig;

export type WithForRootConfig = {
	forRootConfig: UnknownRecord;
};

export type StaticModule<Def extends StaticModuleDef> = {
	name: string;
	controllers?: AnyController[];
	providerOptions?: Partial<BuildResolverOptions<any>>;
} & WithProviders<Def> &
	WithExports<Def> &
	WithImports<Def> &
	WithQueryHandlers<Def> &
	WithCommandHandlers<Def>;

export type DynamicModule<TDef extends DynamicModuleDef> = {
	forRoot(
		config: TDef["forRootConfig"],
		options?: DynamicModuleOptions,
	): StaticModule<TDef>;
};

export type DynamicModuleOptions = {
	registerControllers?: boolean;
};

// ============================================================================
// Module Building Helpers
// ============================================================================

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

type ExtractDeps<Def> = Def extends {
	deps: infer D;
}
	? D
	: Record<string, unknown>;

type ToModuleProviderMap<
	T extends DefProviderMap,
	DepsMap extends Record<string, unknown> = Record<string, unknown>,
> = [keyof T] extends [never]
	? EmptyObject
	: {
			[K in keyof T]: T[K] extends object ? Provider<T[K], DepsMap> : T[K];
		};

// ============================================================================
// Handlers
// ============================================================================

type WithQueryHandlers<Def extends StaticModuleDef> =
	Def["queryHandlers"] extends readonly []
		? { queryHandlers?: ToModuleHandlerArray<Def["queryHandlers"]> }
		: { queryHandlers: ToModuleHandlerArray<Def["queryHandlers"]> };

type WithCommandHandlers<Def extends StaticModuleDef> =
	Def["commandHandlers"] extends readonly []
		? { commandHandlers?: ToModuleHandlerArray<Def["commandHandlers"]> }
		: { commandHandlers: ToModuleHandlerArray<Def["commandHandlers"]> };

type ToModuleHandlerArray<T extends readonly any[]> = T extends readonly []
	? readonly []
	: {
			readonly [K in keyof T]: T[K] extends ConstructorHandler<any>
				? T[K] | ClassHandler<T[K]>
				: T[K];
		};

// ============================================================================
// Imports
// ============================================================================

type WithImports<Def extends StaticModuleDef> = 0 extends 1 & Def
	? { imports?: (AnyModule | ForwardRef)[] }
	: Def["imports"] extends ModuleImport[]
		? Def["imports"] extends []
			? { imports?: [] }
			: { imports: WithForwardRefImports<Def["imports"]> }
		: { imports?: never };

type WithForwardRefImports<T extends readonly ModuleImport[]> = {
	[K in keyof T]: T[K] extends ModuleRef<infer MDef>
		? ForwardRef<ForwardRefModule<MDef>>
		: T[K] extends StaticModule<any>
			? T[K]
			: T[K];
};

type ForwardRefModule<MDef> = MDef extends {
	exports: infer E extends DefProviderMap;
	providers: infer P extends DefProviderMap;
}
	? {
			name: string;
			exports: ToModuleProviderMap<E, any>;
			providers: ToModuleProviderMap<P, any>;
		}
	: AnyModule;
