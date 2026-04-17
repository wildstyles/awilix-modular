import {
	createStaticModule,
	type ModuleDef,
	type QueryScenarioInput,
	type QueryScenario,
} from "awilix-modular";

import { OwnersModule } from "@/modules/owners/owners.module.js";
import { CatsController } from "./cats.controller.js";
import { CatsService } from "./cats.service.js";
import { CatsDecoratedController } from "./cats-decorated.controller.js";
import { CatsScopedController } from "./cats-scoped.controller.js";
import { DogsService } from "./dogs.service.js";
import { GetCatsQueryHandler } from "./get-cats.q-handler.js";
import { GetCatsService } from "./get-cats.service.js";

import { CatsAuthMiddleware } from "./cats-auth.middleware.js";
import { CatsLoggingMiddleware } from "./cats-logging.middleware.js";

import { TenantModule } from "../tenant/tenant.module.js";

export type CatsModuleDef = ModuleDef<{
	providers: {
		catsService: CatsService;
		dogsService: DogsService;
		getCatsService: GetCatsService;
	};
	exportKeys: "catsService";
	imports: [typeof OwnersModule, typeof TenantModule];
	queryHandlers: [GetCatsQueryHandler];
	queryPreHandlers: {
		logging: CatsLoggingMiddleware;
		auth: CatsAuthMiddleware;
	};
}>;

export type Deps = CatsModuleDef["deps"];
export type QueryContext = CatsModuleDef["queryContext"];

export type QueryHandlerExecuteScenario<
	TScenario extends QueryScenarioInput<CatsModuleDef>,
> = QueryScenario<CatsModuleDef, TScenario>;

export const CatsModule = createStaticModule<CatsModuleDef>({
	name: "CatsModule",

	imports: [OwnersModule, TenantModule],

	queryPreHandlers: {
		logging: { useClass: CatsLoggingMiddleware },
		// logging: CatsLoggingMiddleware,
		auth: CatsAuthMiddleware,
	},

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
			// lifetime: "TRANSIENT"ta
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

	// queryHandlers: [GetCatsQueryHandler],
	queryHandlers: [{ useClass: GetCatsQueryHandler }],
	controllers: [
		CatsController,
		CatsDecoratedController,
		{
			useClass: CatsScopedController,
			lifetime: "SCOPED",
		},
	],
});
