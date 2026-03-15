import { Module } from "@nestjs/common";

import { CatsModule } from "./modules/cats/cats.module.js";
import { OwnersModule } from "./modules/owners/owners.module.js";

export type ForwardRef<T> = T;

@Module({
	imports: [CatsModule, OwnersModule],
})
export class AppModule {}
