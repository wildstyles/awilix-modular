import {
	createStaticModule,
	forwardRef,
	type ModuleDef,
	type StaticModule,
	type ModuleRef,
} from "awilix-modular";

import { InventoryService } from "./inventory.service.js";

import { LibraryModule, LibraryModuleDef } from "../library/library.module.js";

export type InventoryModuleDef = ModuleDef<{
	providers: {
		inventoryService: InventoryService;
	};
	exportKeys: "inventoryService";
	imports: [ModuleRef<LibraryModuleDef>];
}>;

export type Deps = InventoryModuleDef["deps"];

// TODO: why explicit StaticModule is needed
export const InventoryModule: StaticModule<InventoryModuleDef> =
	createStaticModule<InventoryModuleDef>({
		name: "InventoryModule",

		imports: [forwardRef(() => LibraryModule)],

		providers: {
			inventoryService: {
				useClass: InventoryService,
			},
		},

		exports: {
			inventoryService: {
				useClass: InventoryService,
				// allowCircular: true,
			},
		},
	});
