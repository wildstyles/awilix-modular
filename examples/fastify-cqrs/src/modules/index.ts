import {
	type Controller as BaseController,
	createStaticModule,
	type ModuleDef,
} from "awilix-modular";
import type { FastifyInstance } from "@/app.js";
import {
	CatsModule,
	type CatsModuleQueryContracts,
} from "@/modules/cats/cats.module.js";
import { type OwnersModuleQueryContracts } from "@/modules/owners/owners.module.js";

export type QueryContracts = CatsModuleQueryContracts &
	OwnersModuleQueryContracts;

export type CommandContracts = Record<string, never>;

export interface Controller extends BaseController<FastifyInstance> {}

export type AppModuleDef = ModuleDef<{
	imports: [typeof CatsModule];
}>;

export const AppModule = createStaticModule<AppModuleDef>({
	name: "AppModule",
	imports: [CatsModule],
});
