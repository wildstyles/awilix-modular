import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import Fastify, {
	type FastifyInstance as DefaultFastifyInstance,
	type FastifyBaseLogger,
	type RawReplyDefaultExpression,
	type RawRequestDefaultExpression,
	type RawServerDefault,
} from "fastify";

export type FastifyInstance = DefaultFastifyInstance<
	RawServerDefault,
	RawRequestDefaultExpression<RawServerDefault>,
	RawReplyDefaultExpression<RawServerDefault>,
	FastifyBaseLogger,
	TypeBoxTypeProvider
>;

export function buildApp() {
	const app: FastifyInstance = Fastify({
		logger: true,
	}).withTypeProvider<TypeBoxTypeProvider>();

	// Turns off response validation
	app.setSerializerCompiler(() => {
		return (data) => JSON.stringify(data);
	});

	return app;
}
