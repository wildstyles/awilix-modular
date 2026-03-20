/**
 * Possible Http verb values.
 */
export type HttpVerb =
	| "GET"
	| "HEAD"
	| "POST"
	| "PUT"
	| "DELETE"
	| "CONNECT"
	| "OPTIONS"
	| "PATCH"
	| "*";

/**
 * Http methods.
 */
export const HttpVerbs = {
	GET: "GET",
	HEAD: "HEAD",
	POST: "POST",
	PUT: "PUT",
	DELETE: "DELETE",
	CONNECT: "CONNECT",
	OPTIONS: "OPTIONS",
	PATCH: "PATCH",
	ALL: "*",
} as const;
