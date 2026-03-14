import {
	type Controller as BaseController,
	createStaticModule,
	type ModuleDef,
} from "awilix-modular";
import type { FastifyInstance } from "@/app.js";
import {
	LibraryModule,
	type LibraryModuleQueryContracts,
} from "@/modules/library/library.module.js";

export type QueryContracts = LibraryModuleQueryContracts;

export type CommandContracts = Record<string, never>;

export interface Controller extends BaseController<FastifyInstance> {}

export type AppModuleDef = ModuleDef<{
	imports: [typeof LibraryModule];
}>;

export const AppModule = createStaticModule<AppModuleDef>({
	name: "AppModule",
	imports: [LibraryModule],
});
