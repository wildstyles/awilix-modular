import {
	createStaticModule,
	forwardRef,
	type ModuleDef,
	type StaticModule,
	type ModuleRef,
} from "awilix-modular";

import { OwnersService } from "./owners.service.js";
import { Owners1Service } from "./owners1.service.js";

import { GetOwnersController } from "./get-owners.controller.js";
import { GetOwnersQueryHandler } from "./get-owners.q-handler.js";

import { CatsModule, CatsModuleDef } from "../cats/cats.module.js";

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

		providers: {
			owners1Service: {
				useClass: Owners1Service,
			},
			ownersService: {
				useClass: OwnersService,
			},
		},

		exports: {
			owners1Service: {
				useClass: Owners1Service,
			},
			ownersService: {
				useClass: OwnersService,
				// allowCircular: true,
			},
		},

		queryHandlers: [GetOwnersQueryHandler],
		controllers: [GetOwnersController],
	});
