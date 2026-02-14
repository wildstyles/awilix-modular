import { asClass, asValue, createContainer } from "awilix";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DIContext } from "../lib/di-context.js";
import type { AnyModule } from "../lib/di-context.types.js";

describe("DIContext", () => {
	let diContext: DIContext;

	class TestableBase {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		constructor(private deps?: any) {}

		getDepKeys() {
			return Object.keys(this.deps ?? {});
		}

		getName() {
			return this.constructor.name;
		}
	}

	const anyModule: AnyModule = Object.freeze({
		name: "AnyModule",
		exports: {},
		imports: [],
		providers: {},
	});

	const rootContainerResolvers = {
		logger: asValue({ info: vi.fn(), error: vi.fn() }),
		config: asValue({ env: "test" }),
	};
	const rootResolversCount = Object.keys(rootContainerResolvers).length;

	beforeEach(() => {
		const rootContainer = createContainer().register(rootContainerResolvers);

		diContext = new DIContext(rootContainer);
	});

	describe("Ensure that module interactions/declarations are correct", () => {
		it("should throw an error when a module has duplicate imports", () => {
			const importedModule: AnyModule = {
				...anyModule,
				name: "SharedModule",
			};

			const moduleWithDuplicateImports: AnyModule = {
				...anyModule,
				name: "MainModule",
				imports: [importedModule, importedModule],
			};

			expect(() => {
				diContext.registerModules([moduleWithDuplicateImports]);
			}).toThrow('Module "MainModule" has duplicate import of "SharedModule"');
		});

		it("should throw an error when a module has provider name conflicts with imported modules", () => {
			const importedModule: AnyModule = {
				...anyModule,
				name: "SharedModule",
				providers: {
					sharedService: asClass(class SharedService extends TestableBase {}),
				},
				exports: {
					sharedService: asClass(class SharedService extends TestableBase {}),
				},
			};

			const moduleWithConflict: AnyModule = {
				...anyModule,
				name: "MainModule",
				imports: [importedModule],
				providers: {
					sharedService: asClass(
						class ConflictingService extends TestableBase {},
					),
				},
			};

			expect(() => {
				diContext.registerModules([moduleWithConflict]);
			}).toThrow(
				'Module "MainModule" has provider name conflicts with imported modules: sharedService',
			);
		});

		it("should throw an error when factory provider depends on non-existent provider", () => {
			const testModule: AnyModule = {
				...anyModule,
				name: "InvalidFactoryModule",
				providers: {
					factoryService: {
						provide: asClass(TestableBase).scoped(),
						inject: ["nonExistentService"],
						useFactory: () => new TestableBase(),
					},
				},
			};

			expect(() => {
				diContext.registerModules([testModule]);
			}).toThrow(
				'"nonExistentService" does not exist in scope of InvalidFactoryModule',
			);
		});
	});

	describe("Factory Provider Registration", () => {
		it("should register a factory provider without dependencies", () => {
			const testModule: AnyModule = {
				...anyModule,
				name: "FactoryModule",
				providers: {
					factoryService: {
						provide: asClass(TestableBase).scoped(),
						inject: [],
						useFactory: () => new TestableBase(),
					},
				},
			};

			diContext.registerModules([testModule]);

			const scope = diContext.moduleScopes.get("FactoryModule")!;

			expect(scope.hasRegistration("factoryService")).toBeTruthy();
			expect(scope.resolve("factoryService").getDepKeys().length).toBe(0);
		});

		it("should register a factory provider with dependencies", () => {
			const testModule: AnyModule = {
				...anyModule,
				name: "FactoryWithDepsModule",
				providers: {
					baseService: asClass(TestableBase),
					factoryService: {
						provide: asClass(TestableBase).scoped(),
						inject: ["baseService"],
						useFactory: (baseService: TestableBase) =>
							new TestableBase({ baseService }),
					},
				},
			};

			diContext.registerModules([testModule]);

			const scope = diContext.moduleScopes.get("FactoryWithDepsModule")!;
			const factoryService = scope.resolve("factoryService");

			expect(scope.hasRegistration("factoryService")).toBeTruthy();
			expect(factoryService.getDepKeys().length).toBe(1);
			expect(factoryService.getDepKeys()[0]).toBe("baseService");
		});

		it("should register factory providers correctly despite on order of registration", () => {
			const testModule: AnyModule = {
				...anyModule,
				name: "OrderIndependentModule",
				providers: {
					factoryServiceA: {
						provide: asClass(TestableBase).scoped(),
						inject: ["factoryServiceB", "serviceA"],
						useFactory: (
							factoryServiceB: TestableBase,
							serviceA: TestableBase,
						) => new TestableBase({ factoryServiceB, serviceA }),
					},
					factoryServiceB: {
						provide: asClass(TestableBase).scoped(),
						inject: ["serviceA"],
						useFactory: (serviceA: TestableBase) =>
							new TestableBase({ serviceA }),
					},
					serviceA: asClass(class ServiceA extends TestableBase {}),
				},
			};

			diContext.registerModules([testModule]);

			const scope = diContext.moduleScopes.get("OrderIndependentModule")!;
			const factoryServiceA = scope.resolve("factoryServiceA");
			const factoryServiceB = scope.resolve("factoryServiceB");
			const serviceA = scope.resolve("serviceA");

			expect(serviceA.getDepKeys().length).toBe(3 + rootResolversCount);
			expect(serviceA.getDepKeys()).toContain("factoryServiceA");
			expect(serviceA.getDepKeys()).toContain("factoryServiceB");

			expect(factoryServiceA.getDepKeys().length).toBe(2);
			expect(factoryServiceA.getDepKeys()).toContain("factoryServiceB");
			expect(factoryServiceA.getDepKeys()).toContain("serviceA");

			expect(factoryServiceB.getDepKeys().length).toBe(1);
			expect(factoryServiceB.getDepKeys()).toContain("serviceA");
		});
	});

	describe("Simple Provider Registration", () => {
		it("should register a module with providers within one scope", () => {
			diContext.registerModules([
				{
					...anyModule,
					name: "TestModule",
					providers: {
						testService: asClass(class TestService extends TestableBase {}),
					},
				},
			]);

			const scope = diContext.moduleScopes.get("TestModule")!;

			expect(scope.resolve("testService").getName()).toBe("TestService");
		});
	});

	describe("Module Imports and Exports", () => {
		it("should make exported providers from imported module available in importing module", () => {
			const exportedModule: AnyModule = {
				...anyModule,
				name: "ExportedModule",
				imports: [
					{
						...anyModule,
						providers: {
							internalService1: asClass(
								class InternalService1 extends TestableBase {},
							),
						},
						exports: {
							internalService1: asClass(
								class InternalService1 extends TestableBase {},
							),
						},
					},
				],
				providers: {
					sharedService: asClass(class SharedService extends TestableBase {}),
					internalService: asClass(
						class InternalService extends TestableBase {},
					),
				},
				exports: {
					sharedService: asClass(class SharedService extends TestableBase {}),
				},
			};

			diContext.registerModules([
				{
					...anyModule,
					name: "ImportingModule",
					imports: [exportedModule],
					providers: {
						localService: asClass(class LocalService extends TestableBase {}),
					},
				},
			]);

			const scope = diContext.moduleScopes.get("ImportingModule")!;
			const localService = scope.resolve("localService");
			const sharedService = scope.resolve("sharedService");

			expect(scope.hasRegistration("sharedService")).toBeTruthy();
			// internal provider is NOT exported and should be unavailable
			expect(scope.hasRegistration("internalService")).toBeFalsy();
			// imports of imported are also should be unavailable
			expect(scope.hasRegistration("internalService1")).toBeFalsy();

			expect(sharedService.getName()).toBe("SharedService");
			expect(sharedService.getDepKeys()).toContain("internalService");
			expect(sharedService.getDepKeys()).toContain("internalService1");
			// imported module scope knowns nothing about it's host
			expect(sharedService.getDepKeys()).not.toContain("localService");

			expect(localService.getName()).toBe("LocalService");
			expect(localService.getDepKeys()).toContain("sharedService");
			expect(localService.getDepKeys()).not.toContain("internalService");
			expect(localService.getDepKeys()).not.toContain("internalService1");
		});
	});
});
