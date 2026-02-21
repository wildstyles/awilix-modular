export type { Contract, Handler } from "./lib/cqrs.types.ts";

export { DIContext } from "./lib/di-context.js";

export type {
	AnyModule,
	ExtractModuleDef,
	MandatoryNameAndRegistrationPair,
	Module,
	ModuleDef,
	StaticModule,
} from "./lib/di-context.types.js";
export { createFactoryProvider } from "./lib/di-context.types.js";
