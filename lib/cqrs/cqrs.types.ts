export type Contract<K extends PropertyKey, P, R> = {
	[Key in K]: {
		payload: P;
		response: R;
	};
};

type Meta = Record<string, unknown>;

export type AnyContract = Contract<string, unknown, unknown>;

export interface Handler<C extends AnyContract, K extends keyof C = keyof C> {
	readonly key: K;
	executor: Executor<ExtractPayload<C, K>, ExtractResponse<C, K>>;
}

export type Executor<P = unknown, R = unknown> = (
	payload: P,
	meta: Meta,
) => Promise<R>;

export type ExtractPayload<
	C extends AnyContract,
	K extends keyof C,
> = C[K]["payload"];

export type ExtractResponse<
	C extends AnyContract,
	K extends keyof C,
> = C[K]["response"];

export type Middleware = (
	payload: unknown,
	meta: Meta,
	handler: Executor,
) => Promise<unknown>;
