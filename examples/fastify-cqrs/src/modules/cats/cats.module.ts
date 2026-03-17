import { createStaticModule, type ModuleDef } from "awilix-modular";

import { OwnersModule } from "@/modules/owners/owners.module.js";

import { GetCatsController } from "./get-cats.controller.js";

import { GetCatsQueryHandler } from "./get-cats.q-handler.js";

import { CatsService } from "./cats.service.js";
import { DogsService } from "./dogs.service.js";

export type CatsModuleQueryContracts = typeof GetCatsQueryHandler.contract;

export type CatsModuleDef = ModuleDef<{
	providers: {
		catsService: CatsService;
		dogsService: DogsService;
	};
	// exportKeys: "catsService";
	exportKeys: "catsService";
	imports: [typeof OwnersModule];
}>;

export type Deps = CatsModuleDef["deps"];

export const CatsModule = createStaticModule<CatsModuleDef>({
	name: "CatsModule",

	imports: [OwnersModule],

	// providerOptions: {
	// 	lifetime: "TRANSIENT",
	// },

	providers: {
		dogsService: {
			useClass: DogsService,
		},
		catsService: {
			useClass: CatsService,
			// lifetime: "TRANSIENT",
			allowCircular: true,
		},
	},

	exports: {
		catsService: {
			allowCircular: true,
			// lifetime: "TRANSIENT",

			useClass: CatsService,
		},
	},

	queryHandlers: [
		// GetCatsQueryHandler,
		{ useClass: GetCatsQueryHandler, lifetime: "TRANSIENT" },
	],
	controllers: [GetCatsController],
});
