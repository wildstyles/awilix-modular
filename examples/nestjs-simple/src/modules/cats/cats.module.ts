import { Module } from "@nestjs/common";

import { CatsController } from "./cats.controller.js";
import { CatsService } from "./cats.service.js";
import { DogsService } from "./dogs.service.js";
// NOTE: strange nestjs behaviour. "import" statement of "OwnersModule"
// must be under "import" of "CatsModule" providers
import { OwnersModule } from "../owners/owners.module.js";

@Module({
	// NOTE: imports module as it is, without forwardRef
	imports: [OwnersModule],
	controllers: [CatsController],
	providers: [CatsService, DogsService],
	exports: [CatsService],
})
export class CatsModule {}
