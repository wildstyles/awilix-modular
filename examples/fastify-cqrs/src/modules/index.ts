import { createStaticModule, type ModuleDef } from "awilix-modular";
import {
	CatsModule,
	type CatsModuleQueryContracts,
} from "@/modules/cats/cats.module.js";
import { OwnersModuleQueryContracts } from "./owners/owners.module.js";

// aggregates all query contracts from each module
export type QueryContracts = CatsModuleQueryContracts &
	OwnersModuleQueryContracts;

export type CommandContracts = Record<string, never>;

export type AppModuleDef = ModuleDef<{
	imports: [typeof CatsModule];
}>;

export const AppModule = createStaticModule<AppModuleDef>({
	name: "AppModule",
	// TODO: registerControllers for handlers.
	imports: [CatsModule],
	// imports: [CatsModule, { name: "Test", imports: [CatsModule] }],
});
