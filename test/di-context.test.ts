import {
	type AwilixContainer,
	asValue,
	type BuildResolverOptions,
	Lifetime,
} from "awilix";

import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";

import { DIContext } from "../lib/di-context.js";
import type { AnyModule, Controller } from "../lib/di-context.types.js";

describe("DIContext", () => {
	let diContext: DIContext;
	let onControllerMock: Mock;

	class ControllerBase implements Controller {
		registerRoutes() {}
	}

	class TestableBase {
		constructor(private deps?: any) {}

		getDeps() {
			return this.deps;
		}

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

	const rootProviders = {
		logger: asValue({ info: vi.fn(), error: vi.fn() }),
		config: asValue({ env: "test" }),
	};
	const rootResolversCount = Object.keys(rootProviders).length;

	beforeEach(() => {
		onControllerMock = vi.fn();
		diContext = new DIContext({
			onController: onControllerMock,
			rootProviders,
		});
	});

	function registerAndGetScope(
		module: Partial<AnyModule>,
	): AwilixContainer<{ [k: string]: TestableBase }> {
		const { scope, name } = diContext.registerModule({
			...anyModule,
			...module,
		});

		return scope;
	}

	describe("Ensure that module interactions/declarations are correct", () => {
		it("should throw an error when a module has duplicate imports", () => {
			const importedModule: AnyModule = {
				...anyModule,
				name: "SharedModule",
			};

			expect(() => {
				registerAndGetScope({
					name: "MainModule",
					imports: [importedModule, importedModule],
				});
			}).toThrow('Module "MainModule" has duplicate import of "SharedModule"');
		});

		it("should throw an error when a module has provider name conflicts with imported modules", () => {
			expect(() => {
				registerAndGetScope({
					name: "MainModule",
					imports: [
						{
							...anyModule,
							providers: {
								sharedService: class SharedService extends TestableBase {},
							},
							exports: {
								sharedService: class SharedService extends TestableBase {},
							},
						},
					],
					providers: {
						sharedService: class ConflictingService extends TestableBase {},
					},
				});
			}).toThrow(
				'Module "MainModule" has provider name conflicts with imported modules: sharedService',
			);
		});

		it("should throw an error when factory provider depends on non-existent provider", () => {
			expect(() => {
				registerAndGetScope({
					name: "InvalidFactoryModule",
					providers: {
						factoryService: {
							provide: TestableBase,
							inject: ["nonExistentService"],
							useFactory: () => new TestableBase(),
						},
					},
				});
			}).toThrow(
				'"nonExistentService" does not exist in scope of InvalidFactoryModule',
			);
		});
	});

	describe("Factory Provider Registration", () => {
		it("should register a factory provider without dependencies", () => {
			const scope = registerAndGetScope({
				providers: {
					factoryService: {
						provide: TestableBase,
						inject: [],
						useFactory: () => new TestableBase(),
					},
				},
			});

			expect(scope.hasRegistration("factoryService")).toBeTruthy();
			expect(scope.resolve("factoryService").getDepKeys().length).toBe(0);
		});

		it("should register a factory provider with dependencies", () => {
			const scope = registerAndGetScope({
				providers: {
					baseService: TestableBase,
					factoryService: {
						provide: TestableBase,
						inject: ["baseService"],
						useFactory: (baseService: TestableBase) =>
							new TestableBase({ baseService }),
					},
				},
			});

			expect(scope.hasRegistration("factoryService")).toBeTruthy();
			expect(scope.resolve("factoryService").getDepKeys().length).toBe(1);
			expect(scope.resolve("factoryService").getDepKeys()[0]).toBe(
				"baseService",
			);
		});

		it("should register factory providers correctly despite on order of registration", () => {
			const scope = registerAndGetScope({
				providers: {
					factoryServiceA: {
						provide: TestableBase,
						inject: ["factoryServiceB", "serviceA"],
						useFactory: (
							factoryServiceB: TestableBase,
							serviceA: TestableBase,
						) => new TestableBase({ factoryServiceB, serviceA }),
					},
					factoryServiceB: {
						provide: TestableBase,
						inject: ["serviceA"],
						useFactory: (serviceA: TestableBase) =>
							new TestableBase({ serviceA }),
					},
					serviceA: class ServiceA extends TestableBase {},
				},
			});

			expect(scope.resolve("serviceA").getDepKeys().length).toBe(
				3 + rootResolversCount,
			);
			expect(scope.resolve("serviceA").getDepKeys()).toContain(
				"factoryServiceA",
			);
			expect(scope.resolve("serviceA").getDepKeys()).toContain(
				"factoryServiceB",
			);

			expect(scope.resolve("factoryServiceA").getDepKeys().length).toBe(2);
			expect(scope.resolve("factoryServiceA").getDepKeys()).toContain(
				"factoryServiceB",
			);
			expect(scope.resolve("factoryServiceA").getDepKeys()).toContain(
				"serviceA",
			);

			expect(scope.resolve("factoryServiceB").getDepKeys().length).toBe(1);
			expect(scope.resolve("factoryServiceB").getDepKeys()).toContain(
				"serviceA",
			);
		});
	});

	describe("Simple Provider Registration", () => {
		it("should register a module with providers within one scope", () => {
			const scope = registerAndGetScope({
				providers: {
					testService: class TestService extends TestableBase {},
				},
			});

			expect(scope.resolve("testService").getName()).toBe("TestService");
		});

		it("should register a ClassConstructor directly with default context settings", () => {
			const scope = registerAndGetScope({
				providers: {
					directClassService: class DirectClassService extends TestableBase {},
				},
			});

			expect(scope.hasRegistration("directClassService")).toBeTruthy();
			expect(scope.resolve("directClassService").getName()).toBe(
				"DirectClassService",
			);
			expect(scope.registrations.directClassService.lifetime).toBe(
				Lifetime.SCOPED,
			);
		});

		it("should register a ClassProvider using useClass with provided settings", () => {
			class ServiceWithClassProvider extends TestableBase {}
			const injectorFn = vi.fn(() => ({ injected: true }));

			const scope = registerAndGetScope({
				providerOptions: {
					lifetime: Lifetime.TRANSIENT,
				},
				providers: {
					classProviderService: {
						injector: injectorFn,
						useClass: ServiceWithClassProvider,
					},
				},
			});

			expect(scope.hasRegistration("classProviderService")).toBeTruthy();
			expect(scope.resolve("classProviderService").getName()).toBe(
				"ServiceWithClassProvider",
			);
			expect(scope.registrations.classProviderService.lifetime).toBe(
				Lifetime.TRANSIENT,
			);
			expect(
				(scope.registrations.classProviderService as BuildResolverOptions<any>)
					.injector,
			).toBe(injectorFn);
		});
	});

	describe("Primitive Provider Registration", () => {
		it("should register string/number primitives as values", () => {
			const scope = registerAndGetScope({
				providers: {
					apiUrl: "https://api.example.com",
					port: 3000,
					isProduction: true,
					debugMode: false,
				},
			});

			expect(scope.resolve("port")).toBe(3000);
			expect(scope.resolve("apiUrl")).toBe("https://api.example.com");
			expect(scope.resolve("isProduction")).toBe(true);
			expect(scope.resolve("debugMode")).toBe(false);
		});

		it("should register primitives alongside class providers", () => {
			const scope = registerAndGetScope({
				providers: {
					apiUrl: "https://api.example.com",
					port: 8080,
					configService: class ConfigService extends TestableBase {},
				},
			});

			expect(scope.resolve("configService").getDeps().port).toBe(8080);
			expect(scope.resolve("configService").getDeps().apiUrl).toBe(
				"https://api.example.com",
			);
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
							internalService1: class InternalService1 extends TestableBase {},
						},
						exports: {
							internalService1: class InternalService1 extends TestableBase {},
						},
					},
				],
				providers: {
					sharedService: class SharedService extends TestableBase {},
					internalService: class InternalService extends TestableBase {},
				},
				exports: {
					sharedService: {
						useClass: class SharedService extends TestableBase {},
						lifetime: Lifetime.TRANSIENT,
					},
				},
			};

			const scope = registerAndGetScope({
				imports: [exportedModule],
				providers: {
					localService: class LocalService extends TestableBase {},
				},
			});

			const exportedScope = diContext.moduleScopes.get("ExportedModule");

			// checks that settings for exported provider are independant of local one
			expect(scope.registrations.sharedService.lifetime).toBe(
				Lifetime.TRANSIENT,
			);
			expect(exportedScope?.registrations.sharedService.lifetime).toBe(
				Lifetime.SCOPED,
			);

			expect(scope.hasRegistration("sharedService")).toBeTruthy();
			// internal provider is NOT exported and should be unavailable
			expect(scope.hasRegistration("internalService")).toBeFalsy();
			// imports of imported are also should be unavailable
			expect(scope.hasRegistration("internalService1")).toBeFalsy();

			expect(scope.resolve("sharedService").getName()).toBe("SharedService");
			expect(scope.resolve("sharedService").getDepKeys()).toContain(
				"internalService",
			);
			expect(scope.resolve("sharedService").getDepKeys()).toContain(
				"internalService1",
			);
			// imported module scope knowns nothing about it's host
			expect(scope.resolve("sharedService").getDepKeys()).not.toContain(
				"localService",
			);

			expect(scope.resolve("localService").getName()).toBe("LocalService");
			expect(scope.resolve("localService").getDepKeys()).toContain(
				"sharedService",
			);
			expect(scope.resolve("localService").getDepKeys()).not.toContain(
				"internalService",
			);
			expect(scope.resolve("localService").getDepKeys()).not.toContain(
				"internalService1",
			);
		});
	});

	describe("Dynamic Module Registration", () => {
		it("should register a dynamic module created via forRoot", () => {
			class Service1 extends TestableBase {}

			const DatabaseModule = {
				forRoot(config: { host: string; port: number }): AnyModule {
					return {
						...anyModule,
						name: "DatabaseModule",
						providers: {
							host: config.host,
							port: config.port,
							service2: class Service2 extends TestableBase {},
							service1: {
								provide: class Service1 {},
								inject: ["host", "port"],
								useFactory: (host: string, port: number) =>
									new Service1({ host, port }),
							},
						},
					};
				},
			};

			const scope = registerAndGetScope(
				DatabaseModule.forRoot({
					host: "localhost",
					port: 5432,
				}),
			);

			expect(scope.resolve("service1").getDeps()).toEqual({
				host: "localhost",
				port: 5432,
			});
			expect(scope.resolve("service2").getDeps().host).toEqual("localhost");
			expect(scope.resolve("service2").getDeps().port).toEqual(5432);
		});

		it("should allow multiple instances of the same dynamic module with different configs", () => {});

		it("should use cached scope for already built module on second import", () => {});

		it("should allow importing a dynamic module's exports in other modules", () => {
			const LoggerModule = {
				forRoot(config: { level: string }): AnyModule {
					return {
						...anyModule,
						name: "LoggerModule",
						providers: {
							level: config.level,
							loggerService: class LoggerService extends TestableBase {},
						},
						exports: {
							loggerService: class LoggerService extends TestableBase {},
						},
					};
				},
			};

			const AppModule = {
				forRoot(): AnyModule {
					return {
						...anyModule,
						name: "AppModule",
						imports: [
							LoggerModule.forRoot({
								level: "debug",
							}),
						],
						providers: {
							appService: class AppService extends TestableBase {},
						},
					};
				},
			};

			const appScope = registerAndGetScope(AppModule.forRoot());

			expect(appScope.resolve("appService").getDepKeys()).toContain(
				"loggerService",
			);
			expect(appScope.resolve("loggerService").getDeps().level).toBe("debug");
		});
	});

	describe("Controller Registration", () => {
		class TestController extends ControllerBase {}
		class AnotherController extends ControllerBase {}

		it("should call onController callback for each controller in a module", () => {
			registerAndGetScope({
				controllers: [TestController, AnotherController],
			});

			expect(onControllerMock).toHaveBeenCalledTimes(2);
			expect(onControllerMock).toHaveBeenCalledWith(
				TestController,
				expect.any(Object),
			);
			expect(onControllerMock).toHaveBeenCalledWith(
				AnotherController,
				expect.any(Object),
			);
		});

		it("should pass the correct scope to onController callback", () => {
			registerAndGetScope({
				providers: {
					testService: class TestService extends TestableBase {},
				},
				controllers: [TestController],
			});

			expect(onControllerMock).toHaveBeenCalledTimes(1);

			const [, scope] = onControllerMock.mock.calls[0];
			expect(scope.hasRegistration("testService")).toBeTruthy();
			expect(scope.resolve("testService").getName()).toBe("TestService");
		});

		it("should throw an error when a controller is registered in multiple modules", () => {
			expect(() => {
				registerAndGetScope({
					name: "TestModule",
					imports: [
						{
							...anyModule,
							name: "FirstModule",
							controllers: [TestController],
						},
						{
							...anyModule,
							name: "SecondModule",
							controllers: [TestController],
						},
					],
				});
			}).toThrow(
				'Controller "TestController" is already registered in module "FirstModule". Attempted to register again in module "SecondModule".',
			);
		});

		it("should not call onController callback when no controllers are defined", () => {
			registerAndGetScope({
				providers: {
					testService: class TestService extends TestableBase {},
				},
			});

			expect(onControllerMock).not.toHaveBeenCalled();
		});

		it("should call onController for controllers in modules with imports", () => {
			registerAndGetScope({
				imports: [
					{
						...anyModule,
						providers: {
							sharedService: class SharedService extends TestableBase {},
						},
						exports: {
							sharedService: class SharedService extends TestableBase {},
						},
						controllers: [TestController],
					},
				],
				controllers: [AnotherController],
			});

			expect(onControllerMock).toHaveBeenCalledTimes(2);
			expect(onControllerMock).toHaveBeenCalledWith(
				TestController,
				expect.any(Object),
			);
			expect(onControllerMock).toHaveBeenCalledWith(
				AnotherController,
				expect.any(Object),
			);
		});
	});
});
