import {
	createStaticModule,
	forwardRef,
	type ModuleDef,
	type ModuleRef,
	type StaticModule,
} from "awilix-modular";
import { CatsModule, type CatsModuleDef } from "../cats/cats.module.js";

import { OwnersService } from "./owners.service.js";
import { Owners1Service } from "./owners1.service.js";

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
	});
