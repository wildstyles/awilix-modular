import { describe, expect, test } from "tstyche";

import type {
	AnyModule,
	CommonDependencies,
	EmptyObject,
	ExtractModuleDef,
	Module,
	ModuleDef,
} from "../../lib/di-context.types.js";

describe("ModuleDef", () => {
	test("should create a module definition with only providers", () => {
		interface UserService {
			getUser(): string;
		}

		type TestModule = ModuleDef<{
			providers: {
				userService: UserService;
			};
		}>;

		expect<TestModule>().type.toBeAssignableTo<{
			providers: {
				userService: UserService;
			};
			exports: EmptyObject;
			imports: [];
			deps: {
				userService: UserService;
			} & CommonDependencies;
		}>();
	});

	test("should create a module definition with providers and exports", () => {
		interface LoggerService {
			log(message: string): void;
		}

		type TestModule = ModuleDef<{
			providers: {
				loggerService: LoggerService;
				internalService: { internal: boolean };
			};
			exportKeys: "loggerService";
		}>;

		expect<TestModule["exports"]>().type.toBe<{
			loggerService: LoggerService;
		}>();

		expect<TestModule["providers"]>().type.toBe<{
			loggerService: LoggerService;
			internalService: { internal: boolean };
		}>();
	});

	test("should properly type deps with imports", () => {
		interface SharedService {
			shared: string;
		}
		interface LocalService {
			local: string;
		}

		type SharedModule = ModuleDef<{
			providers: { sharedService: SharedService };
			exportKeys: "sharedService";
		}>;

		type SharedModuleInstance = Module<SharedModule>;

		type MainModule = ModuleDef<{
			providers: { localService: LocalService };
			imports: [SharedModuleInstance];
		}>;

		// deps should include local providers, imported exports, and common dependencies
		expect<MainModule["deps"]>().type.toHaveProperty("localService");
		expect<MainModule["deps"]>().type.toHaveProperty("sharedService");
	});

	test("should support forRootConfig in module definition", () => {
		type ConfigOptions = {
			host: string;
			port: number;
		};

		type DynamicModule = ModuleDef<{
			providers: { service: { value: string } };
			forRootConfig: ConfigOptions;
		}>;

		expect<DynamicModule>().type.toHaveProperty("forRootConfig");
		expect<DynamicModule["forRootConfig"]>().type.toBe<ConfigOptions>();
	});

	test("should handle empty providers", () => {
		type EmptyModule = ModuleDef<{
			providers?: never;
		}>;

		expect<EmptyModule["providers"]>().type.toBe<EmptyObject>();
		expect<EmptyModule["exports"]>().type.toBe<EmptyObject>();
	});
});

describe("Module", () => {
	test("should create static module for definitions without forRootConfig", () => {
		interface TestService {
			test(): void;
		}

		type TestModuleDef = ModuleDef<{
			providers: { testService: TestService };
		}>;

		type TestModule = Module<TestModuleDef>;

		expect<TestModule>().type.toHaveProperty("name");
		expect<TestModule>().type.toHaveProperty("imports");
		expect<TestModule>().type.toHaveProperty("providers");
		expect<TestModule>().type.toHaveProperty("exports");
		expect<TestModule>().type.not.toHaveProperty("forRoot");
	});

	test("should create dynamic module for definitions with forRootConfig", () => {
		type DbConfig = {
			connectionString: string;
		};

		type DbModuleDef = ModuleDef<{
			providers: { db: { query: () => void } };
			forRootConfig: DbConfig;
		}>;

		type DbModule = Module<DbModuleDef>;

		expect<DbModule>().type.toHaveProperty("forRoot");
		expect<DbModule>().type.not.toHaveProperty("name");
		expect<DbModule>().type.not.toHaveProperty("providers");
	});
});

describe("ExtractModuleDef", () => {
	test("should extract module def from static module", () => {
		interface Service {
			doWork(): void;
		}

		type MyModuleDef = ModuleDef<{
			providers: { service: Service };
		}>;

		type MyModule = Module<MyModuleDef>;

		type Extracted = ExtractModuleDef<MyModule>;

		expect<Extracted>().type.toBe<MyModule>();
	});

	test("should extract module def from dynamic module forRoot return", () => {
		type Config = {
			apiKey: string;
		};
		interface ApiService {
			fetch(): Promise<unknown>;
		}

		type ApiModuleDef = ModuleDef<{
			providers: { apiService: ApiService };
			forRootConfig: Config;
		}>;

		type ApiModule = Module<ApiModuleDef>;

		type Extracted = ExtractModuleDef<ApiModule>;

		// Should extract the return type of forRoot
		expect<Extracted>().type.toHaveProperty("name");
		expect<Extracted>().type.toHaveProperty("providers");
	});
});

describe("CommonDependencies", () => {
	test("should be extensible via declaration merging", () => {
		// This tests that CommonDependencies is an interface that can be extended
		expect<CommonDependencies>().type.toBeAssignableTo<
			Record<PropertyKey, unknown>
		>();
	});

	test("should be included in module deps", () => {
		interface MyService {
			service: string;
		}

		type MyModule = ModuleDef<{
			providers: { myService: MyService };
		}>;

		// deps should include CommonDependencies
		expect<MyModule["deps"]>().type.toBeAssignableTo<
			{ myService: MyService } & CommonDependencies
		>();
	});
});

describe("AnyModule", () => {
	test("should match any valid static module", () => {
		interface TestService {
			test(): void;
		}

		type TestModuleDef = ModuleDef<{
			providers: { testService: TestService };
		}>;

		type TestModule = Module<TestModuleDef>;

		expect<TestModule>().type.toBeAssignableTo<AnyModule>();
	});
});
