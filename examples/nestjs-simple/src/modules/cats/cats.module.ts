import { Module } from "@nestjs/common";
import { CatsController } from "./cats.controller.js";
import { CatsService } from "./cats.service.js";
import { DogsService } from "./dogs.service.js";

@Module({
	controllers: [CatsController],
	providers: [CatsService, DogsService],
	exports: [CatsService],
})
export class CatsModule {}
