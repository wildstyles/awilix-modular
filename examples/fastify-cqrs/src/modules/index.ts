import {
	type Controller as BaseController,
	createStaticModule,
	type ModuleDef,
} from "awilix-modular";
import type { FastifyInstance } from "@/types.js";
import {
	CatsModule,
	type CatsModuleQueryContracts,
} from "@/modules/cats/cats.module.js";
import { OwnersModuleQueryContracts } from "./owners/owners.module.js";

// aggregates all query contracts from each module
export type QueryContracts = CatsModuleQueryContracts &
	OwnersModuleQueryContracts;

export type CommandContracts = Record<string, never>;

// ensures "registerRoutes" exist on controller with proper framework instance
// type for framework route registration
export interface Controller extends BaseController<FastifyInstance> {}

export type AppModuleDef = ModuleDef<{
	imports: [typeof CatsModule];
}>;

export const AppModule = createStaticModule<AppModuleDef>({
	name: "AppModule",
	// TODO: registerControllers for handlers.
	imports: [CatsModule],
	// imports: [CatsModule, { name: "Test", imports: [CatsModule] }],
});
