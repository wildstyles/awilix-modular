import type { Executor } from "./handler.types.js";

// biome-ignore lint/suspicious/noEmptyInterface: Intentionally empty for declaration merging
export interface ExecutionContext {}

// biome-ignore lint/suspicious/noEmptyInterface: Intentionally empty for declaration merging
export interface MiddlewareTagRegistry {}

// Helper: Union to Intersection utility
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
	k: infer I,
) => void
	? I
	: never;

// Helper: compute context type from tags with optional exclusions
export type ContextFromTags<
	Tags extends
		readonly (keyof MiddlewareTagRegistry)[] = (keyof MiddlewareTagRegistry)[],
	ExcludeTags extends readonly (keyof MiddlewareTagRegistry)[] = never[],
> = UnionToIntersection<
	MiddlewareTagRegistry[Exclude<Tags[number], ExcludeTags[number]>]
>;

// Check if a tag's dependencies are satisfied by accumulated context
export type AreDependenciesSatisfied<
	AccumulatedContext extends AnyContext,
	RequiredTag extends keyof MiddlewareTagRegistry,
> = AccumulatedContext extends MiddlewareTagRegistry[RequiredTag]
	? true
	: false;

// Default context when no tags specified
// biome-ignore lint/complexity/noBannedTypes: {} is the correct type for empty object
export type EmptyContext = {};

export type AnyContext = Record<string, unknown>;

export type MiddlewareFn<
	RequiredContext extends AnyContext = EmptyContext,
	Tag extends keyof MiddlewareTagRegistry = keyof MiddlewareTagRegistry,
> = (
	payload: unknown,
	context: RequiredContext & AnyContext,
	executionContext: ExecutionContext,
	next: Executor<
		unknown,
		unknown,
		RequiredContext & MiddlewareTagRegistry[Tag]
	>,
) => Promise<unknown>;

// Middleware configuration with optional second generic for requires
export type MiddlewareConfig<
	Tag extends keyof MiddlewareTagRegistry,
	Requires extends keyof MiddlewareTagRegistry | never = never,
> = {
	tag: Tag;
	requires?: [Requires] extends [never] ? undefined : Requires;
	execute: [Requires] extends [never]
		? MiddlewareFn<EmptyContext, Tag>
		: MiddlewareFn<MiddlewareTagRegistry[Requires], Tag>;
};

export type Middleware = MiddlewareConfig<
	keyof MiddlewareTagRegistry,
	keyof MiddlewareTagRegistry
>;

export type AreAllTagsAdded<AddedTags extends keyof MiddlewareTagRegistry> =
	Exclude<keyof MiddlewareTagRegistry, AddedTags> extends never ? true : false;
