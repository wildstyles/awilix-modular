import {
	createStaticModule,
	forwardRef,
	type ModuleDef,
	type StaticModule,
	type ModuleRef,
} from "awilix-modular";

import { StockRepository } from "./stock.repository.js";
import { InventoryService } from "./inventory.service.js";

import { LibraryModule, LibraryModuleDef } from "../library/library.module.js";

export type InventoryModuleDef = ModuleDef<{
	providers: {
		stockRepository: StockRepository;
		inventoryService: InventoryService;
	};
	exportKeys: "inventoryService";
	// imports: [typeof LibraryModule]
	imports: [ModuleRef<LibraryModuleDef>];
}>;

export type Deps = InventoryModuleDef["deps"];

// TODO: why explicit StaticModule is needed
export const InventoryModule: StaticModule<InventoryModuleDef> =
	createStaticModule<InventoryModuleDef>({
		name: "InventoryModule",

		imports: [forwardRef(() => LibraryModule)],

		providers: {
			stockRepository: StockRepository,
			inventoryService: InventoryService,
		},

		exports: {
			inventoryService: InventoryService,
		},
	});
