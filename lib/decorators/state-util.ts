import type { HttpVerb } from "./http-verbs.js";

export const STATE = Symbol("Router State");

export type MiddlewareParameter = any[] | any;

export interface IRouteState {
	paths: string[];
	beforeMiddleware: any[];
	afterMiddleware: any[];
	verbs: HttpVerb[];
}
export type MethodName = string | symbol;
export type MethodNameParameter = MethodName | null;

export interface IState {
	root: IRouteState;
	methods: Map<MethodName, IRouteState>;
}

export function setState(metadata: DecoratorMetadataObject, state: IState) {
	metadata[STATE] = state;

	return state;
}

export function getState(metadata: DecoratorMetadataObject): IState | null {
	return (metadata[STATE] as IState) || null;
}

export function createRouteState(): IRouteState {
	return {
		paths: [],
		beforeMiddleware: [],
		afterMiddleware: [],
		verbs: [],
	};
}

export function getOrInitState(metadata: DecoratorMetadataObject) {
	return getState(metadata) || createState();
}

export function createState(): IState {
	return {
		root: createRouteState(),
		methods: new Map<string, IRouteState>(),
	};
}

export function updateState(
	metadata: DecoratorMetadataObject,
	updater: (state: IState) => IState,
): void {
	setState(metadata, updater(getOrInitState(metadata)));
}

export function getOrCreateRouteState(
	state: IState,
	methodName: MethodNameParameter,
) {
	const routeState =
		methodName === null ? state.root : state.methods.get(methodName);

	if (!routeState) {
		return createRouteState();
	}

	return routeState;
}

export function addPaths(
	state: IState,
	methodName: MethodNameParameter,
	paths: string[],
) {
	const routeState = getOrCreateRouteState(state, methodName);

	return updateRouteState(state, methodName, {
		paths: uniq([...routeState.paths, ...paths]),
	});
}

export function addHttpVerbs(
	state: IState,
	methodName: MethodNameParameter,
	verbs: HttpVerb[],
): IState {
	const routeState = getOrCreateRouteState(state, methodName);

	return updateRouteState(state, methodName, {
		verbs: uniq([...routeState.verbs, ...verbs]),
	});
}

export function addBeforeMiddleware(
	state: IState,
	methodName: MethodNameParameter,
	middleware: MiddlewareParameter,
) {
	const routeState = getOrCreateRouteState(state, methodName);

	return updateRouteState(state, methodName, {
		beforeMiddleware: addMiddleware(routeState.beforeMiddleware, middleware),
	});
}

export function addAfterMiddleware(
	state: IState,
	methodName: MethodNameParameter,
	middleware: MiddlewareParameter,
) {
	const routeState = getOrCreateRouteState(state, methodName);

	return updateRouteState(state, methodName, {
		afterMiddleware: addMiddleware(routeState.afterMiddleware, middleware),
	});
}

function addMiddleware(targetArray: Array<any>, value: MiddlewareParameter) {
	return Array.isArray(value)
		? [...targetArray, ...value]
		: [...targetArray, value];
}

function updateRouteState(
	state: IState,
	methodName: MethodNameParameter,
	newState: Partial<IRouteState>,
): IState {
	const mergedState: IRouteState = {
		...getOrCreateRouteState(state, methodName),
		...newState,
	};

	if (methodName === null) {
		return {
			...state,
			root: mergedState,
		};
	}

	// Filters out the entry we're replacing.
	const filteredEntries = Array.from(state.methods.entries()).filter(
		([key]) => key !== methodName,
	);

	return {
		...state,
		methods: new Map([...filteredEntries, [methodName, mergedState]]),
	};
}

export function uniq<T>(src: Array<T>): Array<T> {
	const result: Array<T> = [];
	src.forEach((t) => {
		if (result.indexOf(t) === -1) {
			result.push(t);
		}
	});

	return result;
}
