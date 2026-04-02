import express, { type Express } from "express";

export function buildApp(): Express {
	const app = express();

	app.use(express.json());
	app.use(express.urlencoded({ extended: true }));

	return app;
}
