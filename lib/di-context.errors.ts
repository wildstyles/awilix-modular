export class UnsupportedProviderTypeError extends Error {
	constructor(providerKey: string, moduleName: string) {
		super(
			`Unsupported provider type for "${providerKey}" in module "${moduleName}"`,
		);
		this.name = "UnsupportedProviderTypeError";
	}
}

export class DuplicateControllersInModuleError extends Error {
	constructor(moduleName: string) {
		super(
			`Module "${moduleName}" has duplicate controllers in its controllers array.`,
		);
		this.name = "DuplicateControllersInModuleError";
	}
}

export class ControllerAlreadyRegisteredError extends Error {
	constructor(controllerName: string, moduleName: string) {
		super(
			`Controller "${controllerName}" is already registered in module "${moduleName}". ` +
				`Controllers must be unique across modules. ` +
				`Exclude controllers from one of the module instances.`,
		);
		this.name = "ControllerAlreadyRegisteredError";
	}
}

export class DependencyNotFoundError extends Error {
	constructor(dependencyKey: string, moduleName: string) {
		super(`"${dependencyKey}" does not exist in scope of ${moduleName} module`);
		this.name = "DependencyNotFoundError";
	}
}

export class CircularDependencyError extends Error {
	constructor(moduleName: string, providerKeys: string[]) {
		super(
			`Circular dependency detected in module "${moduleName}" for providers: ${providerKeys.join(", ")}`,
		);
		this.name = "CircularDependencyError";
	}
}

export class DuplicateModuleImportError extends Error {
	constructor(parentModuleName: string, importedModuleName: string) {
		super(
			`Module "${parentModuleName}" has duplicate import of "${importedModuleName}"`,
		);
		this.name = "DuplicateModuleImportError";
	}
}

export class ProviderNameConflictError extends Error {
	constructor(moduleName: string, conflictingKeys: string[]) {
		super(
			`Module "${moduleName}" has provider name conflicts with imported modules: ${conflictingKeys.join(", ")}`,
		);
		this.name = "ProviderNameConflictError";
	}
}

export class RootProviderNameConflictError extends Error {
	constructor(moduleName: string, conflictingKeys: string[]) {
		super(
			`Module "${moduleName}" has provider name conflicts with root providers: ${conflictingKeys.join(", ")}. Root providers are global and cannot be overridden.`,
		);
		this.name = "RootProviderNameConflictError";
	}
}

export class CircularModuleDependencyError extends Error {
	constructor(moduleName: string, chain: string[]) {
		super(
			`Circular module dependency detected: ${chain.join(" -> ")} -> ${moduleName}`,
		);
		this.name = "CircularModuleDependencyError";
	}
}

export class UnsupportedFrameworkError extends Error {
	constructor() {
		super(
			"Unsupported framework detected. Only Fastify and Express are currently supported for decorator-based routing.",
		);
		this.name = "UnsupportedFrameworkError";
	}
}
