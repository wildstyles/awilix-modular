import type {
	AnyModule,
	DynamicModule,
	DynamicModuleDef,
	DynamicModuleOptions,
	StaticModule,
	StaticModuleDef,
} from "./module.types.js";
import type { ForwardRef } from "./module-ref.types.js";
import type { FactoryProvider } from "./provider.types.js";

type StripDynamic<T> = T extends { forRootConfig: any }
	? Omit<T, "forRootConfig">
	: T;

export function forwardRef<T extends AnyModule>(
	getter: () => T,
): ForwardRef<T> {
	return {
		__forward_ref__: true,
		resolve: getter,
	};
}

export function createFactoryProvider<DepsMap extends Record<string, any>>() {
	return <T extends object, const Keys extends readonly (keyof DepsMap)[]>(
		provider: FactoryProvider<T, DepsMap, Keys>,
	): FactoryProvider<T, DepsMap, Keys> => {
		return provider;
	};
}

export function createStaticModule<TDef extends StaticModuleDef>(
	module: StaticModule<StripDynamic<TDef>>,
): StaticModule<StripDynamic<TDef>> {
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
			return {
				...factory(config, options),
				registerControllers: options?.registerControllers ?? false,
			};
		},
	};
}
