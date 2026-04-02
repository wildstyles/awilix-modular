import type { Express } from "express";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

const options: swaggerJsdoc.Options = {
	definition: {
		openapi: "3.0.0",
		info: {
			title: "Awilix Modular Express Example API",
			version: "1.0.0",
			description: "Example Express API with Swagger documentation",
		},
		servers: [
			{
				url: "http://localhost:3000",
				description: "Development server",
			},
		],
	},
	apis: ["./src/**/*.ts"],
};

const swaggerSpec = swaggerJsdoc(options);

export function setupSwagger(app: Express) {
	app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
	app.get("/api-docs.json", (req, res) => {
		res.setHeader("Content-Type", "application/json");
		res.send(swaggerSpec);
	});
}
