export type Contract<K extends PropertyKey, P, R> = {
	[Key in K]: {
		payload: P;
		response: R;
	};
};

type Meta = Record<string, unknown>;

type AnyContract = Contract<string, unknown, unknown>;

export interface Handler<
	C extends AnyContract = AnyContract,
	K extends keyof C = keyof C,
> {
	readonly key: K;
	executor: Executor<ExtractPayload<C, K>, ExtractResponse<C, K>>;
}

type Executor<P = unknown, R = unknown> = (
	payload: P,
	meta: Meta,
) => Promise<R>;

type ExtractPayload<C extends AnyContract, K extends keyof C> = C[K]["payload"];
type ExtractResponse<
	C extends AnyContract,
	K extends keyof C,
> = C[K]["response"];
