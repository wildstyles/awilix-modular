/**
 * Simple Result type for error-as-value pattern
 * Represents either success (Ok) or failure (Error)
 */
export type Result<T, E> = Ok<T> | Err<E>;

class Ok<T> {
	readonly ok = true as const;
	readonly error = undefined;

	constructor(public readonly value: T) {}
}

class Err<E> {
	readonly ok = false as const;
	readonly value = undefined;

	constructor(public readonly error: E) {}
}

export const Result = {
	/**
	 * Create a successful Result
	 */
	ok<T>(value: T): Result<T, never> {
		return new Ok(value);
	},

	/**
	 * Create a failed Result
	 */
	error<E>(error: E): Result<never, E> {
		return new Err(error);
	},
};
