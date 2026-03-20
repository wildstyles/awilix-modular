import { createStaticModule, type ModuleDef } from "awilix-modular";

import { OwnersModule } from "@/modules/owners/owners.module.js";
import { CatsService } from "./cats.service.js";
import { DogsService } from "./dogs.service.js";
import { GetCatsController } from "./get-cats.controller.js";
import type { GetCatsQueryHandler } from "./get-cats.q-handler.js";
import { GetCatsScopedController } from "./get-cats-scoped.controller.js";

export type CatsModuleQueryContracts = typeof GetCatsQueryHandler.contract;

export type CatsModuleDef = ModuleDef<{
	providers: {
		catsService: CatsService;
		dogsService: DogsService;
	};
	// exportKeys: "catsService";
	exportKeys: "catsService";
	// imports: [typeof OwnersModule];
}>;

export type Deps = CatsModuleDef["deps"];

export const CatsModule = createStaticModule<CatsModuleDef>({
	name: "CatsModule",

	// imports: [OwnersModule],

	providerOptions: {
		// lifetime: "SCOPED",
		// lifetime: "TRANSIENT",
	},

	providers: {
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

	queryHandlers: [
		// GetCatsQueryHandler,
		// { useClass: GetCatsQueryHandler, lifetime: "SCOPED" },
	],
	controllers: [
		GetCatsController,
		// GetCatsScopedController,
		{ useClass: GetCatsScopedController, lifetime: "SCOPED" },
	],
});
