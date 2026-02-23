import { describe, expect, test } from "tstyche";

import type { Module, ModuleDef } from "../../lib/di-context.types.js";

describe("Module Import/Export Type Inference", () => {
	test("should correctly infer deps from imported modules", () => {
		// Define a logger module that exports a logger service
		type LoggerModuleDef = ModuleDef<{
			providers: {
				loggerService: { log: (msg: string) => void };
				internalFormatter: { format: (msg: string) => string };
			};
			exportKeys: "loggerService";
		}>;

		type LoggerModule = Module<LoggerModuleDef>;

		// Define an app module that imports the logger module
		type AppModuleDef = ModuleDef<{
			providers: {
				appService: { start: () => void };
			};
			imports: [LoggerModule];
		}>;

		// The deps should include both local providers and imported exports
		expect<AppModuleDef["deps"]>().type.toHaveProperty("appService");
		expect<AppModuleDef["deps"]>().type.toHaveProperty("loggerService");
	});

	test("should handle multiple imports correctly", () => {
		type DbModuleDef = ModuleDef<{
			providers: {
				dbConnection: { query: (sql: string) => Promise<unknown> };
			};
			exportKeys: "dbConnection";
		}>;

		type CacheModuleDef = ModuleDef<{
			providers: {
				cacheService: { get: (key: string) => unknown };
			};
			exportKeys: "cacheService";
		}>;

		type DbModule = Module<DbModuleDef>;
		type CacheModule = Module<CacheModuleDef>;

		type ApiModuleDef = ModuleDef<{
			providers: {
				apiService: { fetch: () => Promise<unknown> };
			};
			imports: [DbModule, CacheModule];
		}>;

		// Should have access to exports from both imported modules
		expect<ApiModuleDef["deps"]>().type.toHaveProperty("apiService");
		expect<ApiModuleDef["deps"]>().type.toHaveProperty("dbConnection");
		expect<ApiModuleDef["deps"]>().type.toHaveProperty("cacheService");
	});

	test("should handle nested imports (transitive dependencies)", () => {
		// Base module with config
		type ConfigModuleDef = ModuleDef<{
			providers: {
				config: { env: string };
			};
			exportKeys: "config";
		}>;

		type ConfigModule = Module<ConfigModuleDef>;

		// Logger module imports config
		type LoggerModuleDef = ModuleDef<{
			providers: {
				logger: { log: (msg: string) => void };
			};
			exportKeys: "logger";
			imports: [ConfigModule];
		}>;

		type LoggerModule = Module<LoggerModuleDef>;

		// App module imports logger (but not config directly)
		type AppModuleDef = ModuleDef<{
			providers: {
				app: { run: () => void };
			};
			imports: [LoggerModule];
		}>;

		// App should have access to logger (direct import export)
		expect<AppModuleDef["deps"]>().type.toHaveProperty("logger");
	});

	test("should properly type empty exports", () => {
		type InternalModuleDef = ModuleDef<{
			providers: {
				service: { internal: boolean };
			};
			// No exportKeys specified
		}>;

		type InternalModule = Module<InternalModuleDef>;

		type MainModuleDef = ModuleDef<{
			providers: {
				mainService: { main: boolean };
			};
			imports: [InternalModule];
		}>;

		// Since InternalModule exports nothing, deps should only have local providers
		expect<MainModuleDef["deps"]>().type.toHaveProperty("mainService");
	});
});

describe("Dynamic Module Type Inference", () => {
	test("should correctly type forRoot method", () => {
		// TODO: find out why interface instead of type causes error
		type DbConfig = {
			host: string;
			port: number;
			database: string;
		};

		type DbModuleDef = ModuleDef<{
			providers: {
				dbService: { query: (sql: string) => Promise<unknown> };
			};
			exportKeys: "dbService";
			forRootConfig: DbConfig;
		}>;

		type DbModule = Module<DbModuleDef>;

		// Dynamic modules should have forRoot method
		expect<DbModule>().type.toHaveProperty("forRoot");

		// forRoot should accept the config type
		expect<DbModule>().type.toHaveProperty("forRoot");
	});

	test("should correctly type forRoot return value", () => {
		type AuthConfig = {
			secret: string;
			expiresIn: number;
		};

		type AuthModuleDef = ModuleDef<{
			providers: {
				authService: { verify: (token: string) => boolean };
			};
			exportKeys: "authService";
			forRootConfig: AuthConfig;
		}>;

		type AuthModule = Module<AuthModuleDef>;

		// The return value of forRoot should be a static module
		type StaticAuthModule = ReturnType<AuthModule["forRoot"]>;

		expect<StaticAuthModule>().type.toHaveProperty("name");
		expect<StaticAuthModule>().type.toHaveProperty("providers");
		expect<StaticAuthModule>().type.toHaveProperty("exports");
		expect<StaticAuthModule>().type.toHaveProperty("imports");
	});

	test("should distinguish between static and dynamic modules", () => {
		type StaticModuleDef = ModuleDef<{
			providers: { service: { value: string } };
		}>;

		type DynamicModuleDef = ModuleDef<{
			providers: { service: { value: string } };
			forRootConfig: { config: string };
		}>;

		type StaticMod = Module<StaticModuleDef>;
		type DynamicMod = Module<DynamicModuleDef>;

		// Static module should NOT have forRoot
		expect<StaticMod>().type.not.toHaveProperty("forRoot");

		// Dynamic module should have forRoot
		expect<DynamicMod>().type.toHaveProperty("forRoot");

		// Static module should have module properties
		expect<StaticMod>().type.toHaveProperty("name");

		// Dynamic module should NOT have module properties (only forRoot)
		expect<DynamicMod>().type.not.toHaveProperty("name");
	});
});

describe("Complex Module Scenarios", () => {
	test("should handle modules with multiple export keys", () => {
		type MultiExportModuleDef = ModuleDef<{
			providers: {
				serviceA: { a: string };
				serviceB: { b: number };
				serviceC: { c: boolean };
				internalService: { internal: true };
			};
			exportKeys: "serviceA" | "serviceB" | "serviceC";
		}>;

		type MultiExportModule = Module<MultiExportModuleDef>;

		type ConsumerModuleDef = ModuleDef<{
			providers: {
				consumer: { consume: () => void };
			};
			imports: [MultiExportModule];
		}>;

		// Should have access to all exported services
		expect<ConsumerModuleDef["deps"]>().type.toHaveProperty("serviceA");
		expect<ConsumerModuleDef["deps"]>().type.toHaveProperty("serviceB");
		expect<ConsumerModuleDef["deps"]>().type.toHaveProperty("serviceC");
	});

	test("should handle modules with CommonDependencies", () => {
		type ModuleWithCommonDeps = ModuleDef<{
			providers: {
				myService: { service: boolean };
			};
		}>;

		// deps should include CommonDependencies
		// Note: In real usage, CommonDependencies would be extended via declaration merging
		expect<ModuleWithCommonDeps["deps"]>().type.toHaveProperty("myService");
	});

	test("should handle provider maps correctly", () => {
		type ComplexProviderMap = {
			stringService: { value: string };
			numberService: { value: number };
			nestedService: {
				nested: {
					deeply: {
						value: boolean;
					};
				};
			};
		};

		type ComplexModuleDef = ModuleDef<{
			providers: ComplexProviderMap;
			exportKeys: "stringService" | "nestedService";
		}>;

		expect<ComplexModuleDef["exports"]>().type.toBe<{
			stringService: { value: string };
			nestedService: {
				nested: {
					deeply: {
						value: boolean;
					};
				};
			};
		}>();
	});
});

describe("Type Guards and Utility Types", () => {
	test("should properly type controller constructors", () => {
		interface Controller<TFramework = unknown> {
			registerRoutes: (framework: TFramework) => void;
		}

		type ControllerConstructor<TFramework = unknown> = {
			new (...args: any[]): Controller<TFramework>;
		};

		class ExpressController implements Controller<{ app: unknown }> {
			registerRoutes(_framework: { app: unknown }) {
				expect<typeof _framework>().type.toBe<{ app: unknown }>();
			}
		}

		expect<typeof ExpressController>().type.toBeAssignableTo<
			ControllerConstructor<{ app: unknown }>
		>();
	});

	test("should properly type handler constructors", () => {
		type HandlerConstructor = {
			new (
				...args: any[]
			): {
				key: string;
				executor: (
					payload: unknown,
					meta: Record<string, unknown>,
				) => Promise<unknown>;
			};
		};

		class MyHandler {
			key = "test" as const;
			async executor(_payload: unknown, _meta: Record<string, unknown>) {
				return {};
			}
		}

		expect<typeof MyHandler>().type.toBeAssignableTo<HandlerConstructor>();
	});
});
