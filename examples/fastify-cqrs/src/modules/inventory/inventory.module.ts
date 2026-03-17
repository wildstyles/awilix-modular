import {
	createStaticModule,
	forwardRef,
	type ModuleDef,
	type StaticModule,
	type ModuleRef,
} from "awilix-modular";

import { InventoryService } from "./inventory.service.js";
import { Inventory1Service } from "./inventory1.service.js";

import { LibraryModule, LibraryModuleDef } from "../library/library.module.js";

export type InventoryModuleDef = ModuleDef<{
	providers: {
		inventoryService: InventoryService;
		inventory1Service: Inventory1Service;
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
			inventory1Service: {
				useClass: Inventory1Service,
			},
			inventoryService: {
				useClass: InventoryService,
			},
		},

		exports: {
			inventoryService: {
				useClass: InventoryService,
				allowCircular: true,
			},
		},
	});
