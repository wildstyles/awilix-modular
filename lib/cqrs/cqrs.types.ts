export type Contract<K extends string, P, R> = {
	[Key in K]: {
		payload: P;
		response: R;
	};
};

// Tag Registry - can be extended via module augmentation
// Simple mapping of tag name to meta type
// biome-ignore lint/suspicious/noEmptyInterface: Intentionally empty for declaration merging
export interface MiddlewareTagRegistry {}

// Check if a tag's dependencies are satisfied by accumulated meta
export type AreDependenciesSatisfied<
	AccumulatedMeta extends AnyMeta,
	RequiredTag extends keyof MiddlewareTagRegistry,
> = AccumulatedMeta extends MiddlewareTagRegistry[RequiredTag] ? true : false;

// Helper: compute meta type from tags with optional exclusions
export type MetaFromTags<
	Tags extends
		readonly (keyof MiddlewareTagRegistry)[] = (keyof MiddlewareTagRegistry)[],
	ExcludeTags extends readonly (keyof MiddlewareTagRegistry)[] = never[],
> = UnionToIntersection<
	MiddlewareTagRegistry[Exclude<Tags[number], ExcludeTags[number]>]
>;

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
	k: infer I,
) => void
	? I
	: never;

// Default meta when no tags specified
// biome-ignore lint/complexity/noBannedTypes: {} is the correct type for empty object
export type EmptyMeta = {};

export type AnyMeta = Record<string, unknown>;

export type AnyContract = Contract<string, unknown, unknown>;

// Handler now with Meta as second param (before K which has default)
export interface Handler<
	C extends AnyContract,
	M extends MetaFromTags = MetaFromTags,
	K extends keyof C = keyof C,
> {
	readonly key: K;
	readonly middlewareTags?: readonly (keyof MiddlewareTagRegistry)[];
	readonly excludeMiddlewareTags?: readonly (keyof MiddlewareTagRegistry)[];
	executor: Executor<ExtractPayload<C, K>, ExtractResponse<C, K>, M>;
}

export type Executor<
	P = unknown,
	R = unknown,
	M extends MetaFromTags = MetaFromTags,
> = (payload: P, meta: M) => Promise<R>;

export type ExtractPayload<
	C extends AnyContract,
	K extends keyof C,
> = C[K]["payload"];

export type ExtractResponse<
	C extends AnyContract,
	K extends keyof C,
> = C[K]["response"];

export type MiddlewareFn<
	RequiredMeta extends AnyMeta = EmptyMeta,
	Tag extends keyof MiddlewareTagRegistry = keyof MiddlewareTagRegistry,
> = (
	payload: unknown,
	meta: RequiredMeta & AnyMeta,
	next: Executor<unknown, unknown, RequiredMeta & MiddlewareTagRegistry[Tag]>,
) => Promise<unknown>;

// Middleware configuration with optional second generic for requires
export type MiddlewareConfig<
	Tag extends keyof MiddlewareTagRegistry,
	Requires extends keyof MiddlewareTagRegistry | never = never,
> = {
	tag: Tag;
	requires?: [Requires] extends [never] ? undefined : Requires;
	execute: [Requires] extends [never]
		? MiddlewareFn<EmptyMeta, Tag>
		: MiddlewareFn<MiddlewareTagRegistry[Requires], Tag>;
};

export type Middleware = MiddlewareConfig<
	keyof MiddlewareTagRegistry,
	keyof MiddlewareTagRegistry
>;

export type AreAllTagsAdded<AddedTags extends keyof MiddlewareTagRegistry> =
	Exclude<keyof MiddlewareTagRegistry, AddedTags> extends never ? true : false;
