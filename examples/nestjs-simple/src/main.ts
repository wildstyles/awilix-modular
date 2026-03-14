import { NestFactory } from "@nestjs/core";
import "reflect-metadata";
import { AppModule } from "./app.module.js";

async function bootstrap() {
	const app = await NestFactory.create(AppModule);

	await app.listen(3001);

	console.log("\n🚀 NestJS app running on http://localhost:3001");
}

bootstrap();
