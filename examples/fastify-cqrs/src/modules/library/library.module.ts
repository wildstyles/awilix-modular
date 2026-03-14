import { createStaticModule, type ModuleDef } from "awilix-modular";

import { InventoryModule } from "@/modules/inventory/inventory.module.js";

import { GetAuthorsController } from "./controllers/get-authors.controller.js";
import { GetBooksController } from "./controllers/get-books.controller.js";

import { GetAuthorsQueryHandler } from "./query-handlers/get-authors.q-handler.js";
import { GetBooksQueryHandler } from "./query-handlers/get-books.q-handler.js";

import { GetAuthorsService } from "./services/get-authors.service.js";

export type LibraryModuleQueryContracts = typeof GetBooksQueryHandler.contract &
	typeof GetAuthorsQueryHandler.contract;

export type LibraryModuleDef = ModuleDef<{
	providers: {
		getAuthorsService: GetAuthorsService;
	};
	exportKeys: "getAuthorsService";
	imports: [typeof InventoryModule];
}>;

export type Deps = LibraryModuleDef["deps"];

export const LibraryModule = createStaticModule<LibraryModuleDef>({
	name: "LibraryModule",

	imports: [InventoryModule],

	providers: {
		getAuthorsService: GetAuthorsService,
	},

	exports: {
		getAuthorsService: GetAuthorsService,
	},

	queryHandlers: [GetBooksQueryHandler, GetAuthorsQueryHandler],
	controllers: [GetBooksController, GetAuthorsController],
});
