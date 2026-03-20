import type {
	AnyContract,
	Executor,
	ExtractPayload,
	ExtractResponse,
	Middleware,
} from "./cqrs.types.js";

export interface Bus<C extends AnyContract> {
	register(key: string, executor: Executor): void;
	execute<K extends keyof C>(
		key: K,
		payload: ExtractPayload<C, K>,
	): Promise<ExtractResponse<C, K>>;
	unregister<K extends keyof C>(key: K): void;
	addMiddleware(fn: Middleware): void;
}

export function initializeBus<C extends AnyContract>(): Bus<C> {
	const executors = new Map<string, Executor>();
	const middlewares: Middleware[] = [];

	const keyToString = <K extends keyof C>(key: K): string => String(key);

	function register(key: string, executor: Executor): void {
		const keyStr = keyToString(key);

		if (executors.has(keyStr)) {
			throw new Error(`Handler "${keyStr}" already registered!`);
		}

		executors.set(keyToString(key), executor);
	}

	function execute<K extends keyof C>(
		key: K,
		payload: ExtractPayload<C, K>,
	): Promise<ExtractResponse<C, K>> {
		const keyStr = keyToString(key);
		const executor = executors.get(keyStr);

		if (!executor) {
			throw new Error(`Handler key of ${keyStr} is not registered`);
		}

		const wrappedExecutor = middlewares.reduceRight<Executor>(
			(nextExecutor, middleware) => (payload, meta) =>
				middleware(payload, meta, nextExecutor),
			executor,
		);

		return wrappedExecutor(payload, {});
	}

	function unregister<K extends keyof C>(key: K): void {
		executors.delete(keyToString(key));
	}

	function addMiddleware(fn: Middleware) {
		middlewares.push(fn);
	}

	return {
		register,
		unregister,
		execute,
		addMiddleware,
	};
}
