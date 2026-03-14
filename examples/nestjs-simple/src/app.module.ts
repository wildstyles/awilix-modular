import { Module } from "@nestjs/common";
import { CatsModule } from "./modules/cats/cats.module.js";

@Module({
	imports: [CatsModule],
})
export class AppModule {}
