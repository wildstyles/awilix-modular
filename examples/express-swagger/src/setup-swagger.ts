import type { Express } from "express";
import swaggerUi from "swagger-ui-express";

export function setupSwagger(app: Express, paths: Record<string, any>) {
	const spec = {
		openapi: "3.0.0",
		info: {
			title: "Awilix Modular Express Example API",
			version: "1.0.0",
			description: "Example Express API with automatic OpenAPI generation",
		},
		servers: [
			{
				url: "http://localhost:3000",
				description: "Development server",
			},
		],
		paths,
	};

	app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(spec));
}
