import { Module, forwardRef } from "@nestjs/common";

import { CatsModule } from "../cats/cats.module.js";

import { OwnersController } from "./owners.controller.js";
import { OwnersService } from "./owners.service.js";
import { Owners1Service } from "./owners1.service.js";

@Module({
	// NOTE: Use forwardRef to handle circular dependency with "CatsModule"
	imports: [forwardRef(() => CatsModule)],
	controllers: [OwnersController],
	providers: [OwnersService, Owners1Service],
	exports: [OwnersService, Owners1Service],
})
export class OwnersModule {}
