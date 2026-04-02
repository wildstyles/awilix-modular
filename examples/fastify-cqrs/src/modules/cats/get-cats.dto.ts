import { type Static, Type } from "@sinclair/typebox";

export const GetCatsQuerySchema = Type.Object({
	breed: Type.Optional(Type.String()),
});

const OwnersService1Schema = Type.Object({
	catsServiceId: Type.String(),
	owners1ServiceId: Type.String(),
});

const OwnersServiceSchema = Type.Object({
	catsServiceId: Type.String(),
	ownersServiceId: Type.String(),
	owners1Service: OwnersService1Schema,
});

const DogsServiceSchema = Type.Object({
	dogsServiceId: Type.String(),
	catsServiceId: Type.String(),
});

const CatsServiceSchema = Type.Object({
	catsServiceId: Type.String(),
	dogsServiceId: Type.String(),
	ownersServiceId: Type.String(),
	ownersService1Id: Type.String(),
	ownersService: OwnersServiceSchema,
	dogsService: DogsServiceSchema,
});

const GetCatsRespsonseResultSchema = Type.Object({
	handlerId: Type.String(),
	catsServiceId: Type.String(),
	dogsServiceId: Type.String(),
	dogsService: DogsServiceSchema,
	catsService: CatsServiceSchema,
});

export const GetCatsResponseSchema = Type.Object({
	controllerInstanceId: Type.String(),
	result: GetCatsRespsonseResultSchema,
});

export const GetCatsSchema = {
	querystring: GetCatsQuerySchema,
	response: {
		200: GetCatsResponseSchema,
	},
};

export type DogsServiceResponse = Static<typeof DogsServiceSchema>;
export type CatsServiceResponse = Static<typeof CatsServiceSchema>;

export type GetCatsResult = Static<typeof GetCatsRespsonseResultSchema>;

export type GetCatsQuery = Static<typeof GetCatsQuerySchema>;
export type GetCatsResponse = Static<typeof GetCatsResponseSchema>;
