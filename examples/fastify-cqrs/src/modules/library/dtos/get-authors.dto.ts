import { type Static, Type } from "@sinclair/typebox";

const AuthorSchema = Type.Object({
	id: Type.String(),
	name: Type.String(),
	birthYear: Type.Number(),
	bookCount: Type.Number(),
});

export const GetAuthorsQuerySchema = Type.Object({
	genre: Type.String(),
});

export const GetAuthorsResponseSchema = Type.Object({
	authors: Type.Array(AuthorSchema),
});

export type GetAuthorsQuery = Static<typeof GetAuthorsQuerySchema>;
export type GetAuthorsResponse = Static<typeof GetAuthorsResponseSchema>;
