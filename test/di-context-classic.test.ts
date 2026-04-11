import { type AwilixContainer, AwilixResolutionError, Lifetime } from "awilix";
import { describe, expect, it } from "vitest";
import * as ERRORS from "../lib/di/di-context.errors.js";
import {
	DIContext,
	type DiContextOptions,
	type ModuleScopeTree,
} from "../lib/di/di-context.js";
import {
	type AnyModule,
	createStaticModule,
	type ForwardRef,
	forwardRef,
	type ModuleDef,
	type ModuleRef,
} from "../lib/di/di-context.types.js";

// Test-only type: Override resolve to return 'any' for convenience
type TestContainer = Omit<AwilixContainer, "resolve"> & {
	resolve<T = any>(name: string | symbol): T;
};

type TestModuleScopeTree = Omit<ModuleScopeTree, "scope" | "importedScopes"> & {
	scope: TestContainer;
	importedScopes: Map<string, TestModuleScopeTree>;
};

describe("DIContext - CLASSIC Injection Mode - Circular Dependencies", () => {
	function registerModule(
		module: Partial<AnyModule>,
		options?: Partial<DiContextOptions>,
	): TestModuleScopeTree {
		return DIContext.create(
			{
				name: "TestModule",
				...module,
			},
			{
				framework: {},
				...options,
			},
		);
	}

	class ServiceA {
		public instanceId = Math.random();
		constructor(private serviceB: any) {}

		getInstanceId() {
			return this.instanceId;
		}
		getName() {
			return "ServiceA";
		}
		callB() {
			return this.serviceB.getName();
		}
		getB() {
			return this.serviceB;
		}
	}

	class ServiceB {
		public instanceId = Math.random();
		constructor(private serviceA: any) {}

		getInstanceId() {
			return this.instanceId;
		}
		getName() {
			return "ServiceB";
		}
		callA() {
			return this.serviceA.getName();
		}
		getA() {
			return this.serviceA;
		}
	}

	describe("Circular dependencies within one module", () => {
		it("should throw error when circular dependencies without allowCircular flag", () => {
			expect(() => {
				const { scope } = registerModule({
					providers: {
						serviceA: ServiceA,
						serviceB: ServiceB,
					},
				});

				scope.resolve("serviceA");
			}).toThrow(AwilixResolutionError);
		});

		it("should resolve circular dependencies with allowCircular flag", () => {
			const { scope } = registerModule({
				providers: {
					serviceA: {
						useClass: ServiceA,
						allowCircular: true,
					},
					serviceB: {
						useClass: ServiceB,
					},
				},
			});

			const serviceA = scope.resolve("serviceA");
			const serviceB = scope.resolve("serviceB");

			expect(serviceA.callB()).toBe("ServiceB");
			expect(serviceB.callA()).toBe("ServiceA");
		});
	});

	describe("Module circular dependencies with forwardRef", () => {
		it("should resolve circular dependencies between two modules", () => {
			type ModuleADef = ModuleDef<{
				providers: {
					serviceA: ServiceA;
				};
				imports: [ModuleRef<ModuleBDef>];
				exportKeys: "serviceA";
			}>;

			const ModuleA = createStaticModule<ModuleADef>({
				name: "ModuleA",
				imports: [] as unknown as [ForwardRef<any>],
				providers: {
					serviceA: ServiceA,
				},
				exports: {
					serviceA: ServiceA,
				},
			});

			type ModuleBDef = ModuleDef<{
				providers: {
					serviceB: ServiceB;
				};
				exportKeys: "serviceB";
				imports: [typeof ModuleA];
			}>;

			const ModuleB = createStaticModule<ModuleBDef>({
				name: "ModuleB",
				imports: [ModuleA],
				providers: {
					serviceB: {
						useClass: ServiceB,
					},
				},
				exports: {
					serviceB: {
						useClass: ServiceB,
						allowCircular: true,
					},
				},
			});

			ModuleA.imports = [forwardRef(() => ModuleB)];

			const { scope, importedScopes } = registerModule(ModuleA);

			const serviceA = scope.resolve("serviceA");
			const serviceB = importedScopes.get("ModuleB")?.scope.resolve("serviceB");

			expect(serviceA.callB()).toBe("ServiceB");
			expect(serviceB?.callA()).toBe("ServiceA");
		});

		it("should throw error when circular modules without forwardRef", () => {
			const ModuleA: AnyModule = {
				name: "ModuleA",
				imports: [],
			};

			const ModuleB: AnyModule = {
				name: "ModuleB",
				imports: [ModuleA],
			};

			ModuleA.imports = [ModuleB];

			expect(() => {
				registerModule(ModuleA);
			}).toThrow(ERRORS.CircularModuleDependencyError);
		});
	});

	describe("Lifetime handling with createProxyResolver (SINGLETON)", () => {
		it("should maintain SINGLETON lifetime for circular dependencies", () => {
			const { scope } = registerModule({
				providers: {
					serviceA: {
						useClass: ServiceA,
					},
					serviceB: {
						useClass: ServiceB,
						allowCircular: true,
					},
				},
			});

			const serviceA1 = scope.resolve("serviceA");
			const serviceA2 = scope.resolve("serviceA");
			const serviceB1 = scope.resolve("serviceB");
			const serviceB2 = scope.resolve("serviceB");

			expect(serviceA1.instanceId).toBe(serviceA2.instanceId);
			expect(serviceB1.instanceId).toBe(serviceB2.instanceId);

			expect(serviceA1.getB().instanceId).toBe(serviceB1.instanceId);
			expect(serviceB1.getA().instanceId).toBe(serviceA1.instanceId);
		});

		it("should maintain SINGLETON across module boundaries with circular deps", () => {
			type ModuleADef = ModuleDef<{
				providers: { serviceA: ServiceA };
				imports: [ModuleRef<ModuleBDef>];
				exportKeys: "serviceA";
			}>;

			const ModuleA = createStaticModule<ModuleADef>({
				name: "ModuleA",
				imports: [] as unknown as [ForwardRef<any>],
				providers: {
					serviceA: {
						useClass: ServiceA,
					},
				},
				exports: {
					serviceA: {
						useClass: ServiceA,
					},
				},
			});

			type ModuleBDef = ModuleDef<{
				providers: { serviceB: ServiceB };
				exportKeys: "serviceB";
				imports: [typeof ModuleA];
			}>;

			const ModuleB = createStaticModule<ModuleBDef>({
				name: "ModuleB",
				imports: [ModuleA],
				providers: {
					serviceB: {
						useClass: ServiceB,
					},
				},
				exports: {
					serviceB: {
						useClass: ServiceB,
						allowCircular: true,
					},
				},
			});

			ModuleA.imports = [forwardRef(() => ModuleB)];

			const { scope } = registerModule(ModuleA);

			const serviceA1 = scope.resolve("serviceA");
			const serviceA2 = scope.resolve("serviceA");
			const serviceB1 = scope.resolve("serviceB");
			const serviceB2 = scope.resolve("serviceB");

			expect(serviceA1.instanceId).toBe(serviceA2.instanceId);
			expect(serviceB1.instanceId).toBe(serviceB2.instanceId);
		});
	});

	describe("Lifetime handling with createProxyResolver (TRANSIENT)", () => {
		it("should create new instances for TRANSIENT lifetime with circular deps", () => {
			const { scope } = registerModule({
				providers: {
					serviceA: {
						useClass: ServiceA,
						lifetime: Lifetime.TRANSIENT,
					},
					serviceB: {
						useClass: ServiceB,
						allowCircular: true,
						lifetime: Lifetime.TRANSIENT,
					},
				},
			});

			const serviceA1 = scope.resolve("serviceA");
			const serviceA2 = scope.resolve("serviceA");
			const serviceB1 = scope.resolve("serviceB");
			const serviceB2 = scope.resolve("serviceB");

			expect(serviceA1.getB().instanceId).not.toBe(serviceA2.getB().instanceId);
			expect(serviceB1.getA().instanceId).not.toBe(serviceB2.getA().instanceId);
		});

		it("should handle TRANSIENT exports with circular module deps", () => {
			type ModuleADef = ModuleDef<{
				providers: { serviceA: ServiceA };
				imports: [ModuleRef<ModuleBDef>];
				exportKeys: "serviceA";
			}>;

			const ModuleA = createStaticModule<ModuleADef>({
				name: "ModuleA",
				imports: [] as unknown as [ForwardRef<any>],
				providers: {
					serviceA: {
						useClass: ServiceA,
						lifetime: Lifetime.TRANSIENT,
					},
				},
				exports: {
					serviceA: {
						useClass: ServiceA,
					},
				},
			});

			type ModuleBDef = ModuleDef<{
				providers: { serviceB: ServiceB };
				exportKeys: "serviceB";
				imports: [typeof ModuleA];
			}>;

			const ModuleB = createStaticModule<ModuleBDef>({
				name: "ModuleB",
				imports: [ModuleA],
				providers: {
					serviceB: {
						useClass: ServiceB,
					},
				},
				exports: {
					serviceB: {
						useClass: ServiceB,
						allowCircular: true,
						lifetime: Lifetime.TRANSIENT,
					},
				},
			});

			ModuleA.imports = [forwardRef(() => ModuleB)];

			const { scope } = registerModule(ModuleA);

			const serviceA1 = scope.resolve("serviceA");
			const serviceA2 = scope.resolve("serviceA");

			expect(serviceA1.getB().instanceId).not.toBe(serviceA2.getB().instanceId);
		});
	});

	describe("Lifetime handling with createProxyResolver (SCOPED)", () => {
		it("should maintain SCOPED lifetime within scope for circular deps", () => {
			const { scope } = registerModule({
				providers: {
					serviceA: {
						useClass: ServiceA,
						lifetime: Lifetime.SCOPED,
					},
					serviceB: {
						useClass: ServiceB,
						allowCircular: true,
						lifetime: Lifetime.SCOPED,
					},
				},
			});

			const newScope = scope.createScope();
			const scopedA1 = scope.resolve("serviceA");
			const scopedA2 = scope.resolve("serviceA");
			const newScopedA1 = newScope.resolve<any>("serviceA");
			const newScopedA2 = newScope.resolve<any>("serviceA");

			expect(scopedA1.getB().instanceId).toBe(scopedA2.getB().instanceId);
			expect(newScopedA1.getB().instanceId).not.toBe(
				scopedA2.getB().instanceId,
			);
			expect(newScopedA1.getB().instanceId).toBe(newScopedA2.getB().instanceId);
		});

		it("should handle SCOPED exports across circular modules", () => {
			type ModuleADef = ModuleDef<{
				providers: { serviceA: ServiceA };
				imports: [ModuleRef<ModuleBDef>];
				exportKeys: "serviceA";
			}>;

			const ModuleA = createStaticModule<ModuleADef>({
				name: "ModuleA",
				imports: [] as unknown as [ForwardRef<any>],
				providers: {
					serviceA: {
						useClass: ServiceA,
						lifetime: Lifetime.SCOPED,
					},
				},
				exports: {
					serviceA: {
						useClass: ServiceA,
						lifetime: Lifetime.SCOPED,
					},
				},
			});

			type ModuleBDef = ModuleDef<{
				providers: { serviceB: ServiceB };
				exportKeys: "serviceB";
				imports: [typeof ModuleA];
			}>;

			const ModuleB = createStaticModule<ModuleBDef>({
				name: "ModuleB",
				imports: [ModuleA],
				providers: {
					serviceB: {
						useClass: ServiceB,
						lifetime: Lifetime.SCOPED,
					},
				},
				exports: {
					serviceB: {
						useClass: ServiceB,
						allowCircular: true,
						lifetime: Lifetime.SCOPED,
					},
				},
			});

			ModuleA.imports = [forwardRef(() => ModuleB)];

			const { scope } = registerModule(ModuleA);

			const newScope = scope.createScope();
			const scopedA1 = scope.resolve("serviceA");
			const scopedA2 = scope.resolve("serviceA");
			const newScopedA1 = newScope.resolve<any>("serviceA");
			const newScopedA2 = newScope.resolve<any>("serviceA");

			expect(scopedA1.getB().instanceId).toBe(scopedA2.getB().instanceId);
			expect(newScopedA1.getB().instanceId).not.toBe(
				scopedA2.getB().instanceId,
			);
			expect(newScopedA1.getB().instanceId).toBe(newScopedA2.getB().instanceId);
		});
	});
});
