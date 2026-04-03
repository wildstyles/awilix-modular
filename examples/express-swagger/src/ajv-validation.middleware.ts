import Ajv from "ajv";
import type { Request, Response, NextFunction } from "express";
import { hasValidationSchema, type RouteSchema } from "awilix-modular";

const ajv = new Ajv.default({ coerceTypes: true, removeAdditional: true });

export const createValidationMiddleware = (schema: RouteSchema) => {
	if (!hasValidationSchema(schema)) return null;

	const validate = ajv.compile({
		type: "object",
		properties: {
			...(!!schema.body && { body: schema.body }),
			...(!!schema.querystring && { query: schema.querystring }),
			...(!!schema.params && { params: schema.params }),
			...(!!schema.headers && { headers: schema.headers }),
		},
	});

	return (req: Request, res: Response, next: NextFunction) => {
		const valid = validate({
			body: req.body,
			query: req.query,
			params: req.params,
			headers: req.headers,
		});

		if (!valid) {
			return res.status(400).json({
				error: "Validation failed",
				details: validate.errors,
			});
		}

		next();
	};
};
