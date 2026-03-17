import { type Static, Type } from "@sinclair/typebox";

const OwnerSchema = Type.Object({
	id: Type.String(),
	name: Type.String(),
	catId: Type.String(),
	catName: Type.String(),
	city: Type.String(),
});

export const GetOwnersQuerySchema = Type.Object({
	city: Type.Optional(Type.String()),
	catId: Type.Optional(Type.String()),
});

export const GetOwnersResponseSchema = Type.Object({
	owners: Type.Array(OwnerSchema),
	cities: Type.Array(Type.String()),
});

export type GetOwnersQuery = Static<typeof GetOwnersQuerySchema>;
export type GetOwnersResponse = Static<typeof GetOwnersResponseSchema>;
