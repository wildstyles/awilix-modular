import { type Static, Type } from "@sinclair/typebox";

const CatSchema = Type.Object({
	id: Type.String(),
	name: Type.String(),
	breed: Type.String(),
	age: Type.Number(),
});

export const GetCatsQuerySchema = Type.Object({
	breed: Type.Optional(Type.String()),
});

export const GetCatsResponseSchema = Type.Object({
	catCount: Type.Number(),
});

export type GetCatsQuery = Static<typeof GetCatsQuerySchema>;
export type GetCatsResponse = Static<typeof GetCatsResponseSchema>;
