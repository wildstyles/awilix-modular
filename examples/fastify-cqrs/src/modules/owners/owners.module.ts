import {
	createStaticModule,
	forwardRef,
	type ModuleDef,
	type ModuleRef,
	type StaticModule,
} from "awilix-modular";
import { CatsModule, type CatsModuleDef } from "../cats/cats.module.js";
import { GetOwnersController } from "./get-owners.controller.js";
import type { GetOwnersQueryHandler } from "./get-owners.q-handler.js";
import { OwnersService } from "./owners.service.js";
import { Owners1Service } from "./owners1.service.js";

export type OwnersModuleQueryContracts = typeof GetOwnersQueryHandler.contract;

export type OwnersModuleDef = ModuleDef<{
	providers: {
		ownersService: OwnersService;
		owners1Service: Owners1Service;
	};
	exportKeys: "ownersService" | "owners1Service";
	imports: [ModuleRef<CatsModuleDef>];
}>;

export type Deps = OwnersModuleDef["deps"];

// TODO: why explicit StaticModule is needed
export const OwnersModule: StaticModule<OwnersModuleDef> =
	createStaticModule<OwnersModuleDef>({
		name: "OwnersModule",

		imports: [forwardRef(() => CatsModule)],

		providerOptions: {
			// lifetime: "SCOPED",
			lifetime: "TRANSIENT",
		},

		providers: {
			owners1Service: {
				useClass: Owners1Service,
				// lifetime: "SCOPED",
			},
			ownersService: {
				useClass: OwnersService,
				// lifetime: "SCOPED",
			},
		},

		exports: {
			owners1Service: {
				useClass: Owners1Service,
				// lifetime: "SCOPED",
				lifetime: "SCOPED",
			},
			ownersService: {
				useClass: OwnersService,
				// lifetime: "TRANSIENT",
				lifetime: "SCOPED",

				// allowCircular: true,
			},
		},

		// queryHandlers: [{ useClass: GetOwnersQueryHandler, lifetime: "SCOPED" }],
		controllers: [GetOwnersController],
	});
