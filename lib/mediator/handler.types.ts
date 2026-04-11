import type {
	ContextFromTags,
	MiddlewareTagRegistry,
} from "./middleware.types.js";

export interface Handler<
	C extends AnyContract,
	Ctx extends ContextFromTags = ContextFromTags,
	K extends keyof C = keyof C,
> {
	readonly middlewareTags?: readonly (keyof MiddlewareTagRegistry)[];
	readonly excludeMiddlewareTags?: readonly (keyof MiddlewareTagRegistry)[];
	executor: Executor<ExtractPayload<C, K>, ExtractResponse<C, K>, Ctx>;
}

export type Executor<
	P = unknown,
	R = unknown,
	Ctx extends ContextFromTags = ContextFromTags,
> = (payload: P, context: Ctx) => Promise<R>;

export type Contract<K extends string, P, R> = {
	[Key in K]: {
		payload: P;
		response: R;
	};
};

export type AnyContract = Contract<string, unknown, unknown>;

export type ExtractPayload<
	C extends AnyContract,
	K extends keyof C,
> = C[K]["payload"];

export type ExtractResponse<
	C extends AnyContract,
	K extends keyof C,
> = C[K]["response"];
