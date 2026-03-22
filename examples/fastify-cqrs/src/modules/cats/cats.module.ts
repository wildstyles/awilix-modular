import { createStaticModule, type ModuleDef } from "awilix-modular";

import { OwnersModule } from "@/modules/owners/owners.module.js";
import { CatsService } from "./cats.service.js";
import { DogsService } from "./dogs.service.js";

import { GetCatsQueryHandler } from "./get-cats.q-handler.js";
import { GetCatsService } from "./get-cats.service.js";

import { CatsScopedController } from "./cats-scoped.controller.js";
import { CatsDecoratedController } from "./cats-decorated.controller.js";
import { CatsController } from "./cats.controller.js";

export type CatsModuleQueryContracts = typeof GetCatsQueryHandler.contract;

export type CatsModuleDef = ModuleDef<{
	providers: {
		catsService: CatsService;
		dogsService: DogsService;
		getCatsService: GetCatsService;
	};
	exportKeys: "catsService";
	imports: [typeof OwnersModule];
}>;

export type Deps = CatsModuleDef["deps"];

export const CatsModule = createStaticModule<CatsModuleDef>({
	name: "CatsModule",

	imports: [OwnersModule],

	providerOptions: {
		// lifetime: "SCOPED",
		// lifetime: "TRANSIENT",
	},

	providers: {
		getCatsService: {
			useClass: GetCatsService,
		},
		dogsService: {
			useClass: DogsService,
			// lifetime: "TRANSIENT",
		},
		catsService: {
			useClass: CatsService,
			// lifetime: "SCOPED",
			//

			allowCircular: true,
		},
	},

	exports: {
		catsService: {
			allowCircular: true,
			// lifetime: "SINGLETON",
			// lifetime: "SCOPED",
			lifetime: "TRANSIENT",

			useClass: CatsService,
		},
	},

	queryHandlers: [GetCatsQueryHandler],
	controllers: [
		CatsController,
		CatsDecoratedController,
		{
			useClass: CatsScopedController,
			lifetime: "SCOPED",
		},
	],
});
