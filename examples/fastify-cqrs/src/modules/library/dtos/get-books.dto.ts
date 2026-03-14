import { type Static, Type } from "@sinclair/typebox";

const BookSchema = Type.Object({
	id: Type.String(),
	title: Type.String(),
	authorId: Type.String(),
	authorName: Type.String(),
	publishedYear: Type.Number(),
	genre: Type.String(),
	available: Type.Boolean(),
	availableCopies: Type.Number(),
	totalCopies: Type.Number(),
});

export const GetBooksQuerySchema = Type.Object({
	genre: Type.Optional(Type.String()),
	authorId: Type.Optional(Type.String()),
});

export const GetBooksResponseSchema = Type.Object({
	books: Type.Array(BookSchema),
	genres: Type.Array(Type.String()),
});

export type GetBooksQuery = Static<typeof GetBooksQuerySchema>;
export type GetBooksResponse = Static<typeof GetBooksResponseSchema>;
