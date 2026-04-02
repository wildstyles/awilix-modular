import {
	type Controller as BaseController,
	createStaticModule,
	type ModuleDef,
} from "awilix-modular";
import type { Express } from "express";
import { CatsModule } from "@/modules/cats/cats.module.js";

export interface Controller extends BaseController<Express> {}

export type AppModuleDef = ModuleDef<{
	imports: [typeof CatsModule];
}>;

export const AppModule = createStaticModule<AppModuleDef>({
	name: "AppModule",
	imports: [CatsModule],
});
