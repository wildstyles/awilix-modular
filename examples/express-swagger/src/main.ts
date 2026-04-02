import { DIContext } from "awilix-modular";
import { buildApp } from "@/app.js";
import { AppModule } from "@/modules/index.js";
import { setupSwagger } from "./setup-swagger.js";

async function bootstrap() {
	const app = buildApp();

	setupSwagger(app);

	DIContext.create(AppModule, {
		framework: app,
	});

	const PORT = 3000;
	app.listen(PORT, () => {
		console.log(`Server running on http://localhost:${PORT}`);
		console.log(`API Documentation: http://localhost:${PORT}/api-docs`);
	});
}

bootstrap();
