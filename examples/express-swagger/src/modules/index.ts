import {
	createStaticModule,
	type ModuleDef,
} from "awilix-modular";
import { CatsModule } from "@/modules/cats/cats.module.js";

export type AppModuleDef = ModuleDef<{
	imports: [typeof CatsModule];
}>;

export const AppModule = createStaticModule<AppModuleDef>({
	name: "AppModule",
	imports: [CatsModule],
});
