import { describe, expect, it } from "tstyche";
import type {
	CommonDependencies,
	ModuleDef as D,
	EmptyObject,
	Module as M,
	StaticModule,
} from "../lib/di-context.types.js";
import { createFactoryProvider } from "../lib/di-context.types.js";

describe("Module", () => {
	class P1 {
		private declare readonly __brand: never;
	}
	class P2 {
		private declare readonly __brand: never;
	}
	class P3 {
		private declare readonly __brand: never;
	}
	class P4 {
		private declare readonly __brand: never;
	}
	class P5 {
		private declare readonly __brand: never;
	}

	it("ensures ClassProvider can be passed as provider", () => {
		type M1 = M<D<{ providers: { p1: P1; p2: P2 } }>>;

		// Positive: Should accept useClass provider
		expect({
			name: "Module",
			providers: {
				p1: { useClass: P1 },
				p2: { useClass: P2 },
			},
		}).type.toBeAssignableTo<M1>();
		// Positive: Should accept useClass with options
		expect({
			name: "Module",
			providers: {
				p1: { useClass: P1, lifetime: "SINGLETON" as const },
				p2: { useClass: P2, lifetime: "SCOPED" as const },
			},
		}).type.toBeAssignableTo<M1>();
		// Negative: Should NOT accept wrong class type
		expect({
			name: "Module",
			providers: {
				p1: { useClass: P2 },
				p2: { useClass: P2 },
			},
		}).type.not.toBeAssignableTo<M1>();
	});

	it("ensures FactoryProvider can be passed as provider", () => {
		type M1 = M<D<{ providers: { p1: P1; p2: P2 } }>>;

		// Positive: Should accept factory provider with provide and useFactory
		expect({
			name: "Module",
			providers: {
				p1: {
					provide: P1,
					useFactory: () => new P1(),
				},
				p2: P2,
			},
		}).type.toBeAssignableTo<M1>();
		// Negative: Should NOT accept factory that returns wrong type
		expect({
			name: "Module",
			providers: {
				p1: {
					provide: P1,
					useFactory: () => new P2(),
				},
				p2: P2,
			},
		}).type.not.toBeAssignableTo<M1>();
	});

	it("ensures createFactoryProvider infers DepsMap from module", () => {
		type M1Def = D<{
			providers: { p1: P1; p2: P2; p3: P3 };
		}>;
		type Deps = M1Def["deps"];

		const factory = createFactoryProvider<Deps>();

		factory({
			provide: P4,
			inject: ["p1", "p2"] as const,
			useFactory: (_p1, _p2) => {
				expect<typeof _p1>().type.toBe<P1>();
				expect<typeof _p2>().type.toBe<P2>();

				return new P4();
			},
		});

		expect(
			factory({
				provide: P4,
				inject: ["p1", "p2"] as const,
				useFactory: (_p1, _p2, _p3) => {
					return new P4();
				},
			}),
		).type.toRaiseError();
	});

	it("ensures primitives can be passed as providers", () => {
		type M1 = M<
			D<{
				providers: { p1: ""; p2: boolean; p3: true; p4: 2 };
				exportKeys: "p3";
			}>
		>;

		expect({
			name: "Module",
			exports: { p3: true },
			providers: { p1: "", p2: false, p3: true, p4: 2 },
		} as const).type.toBeAssignableTo<M1>();
	});

	it("ensures providers in definition and declaration are the same", () => {
		type M1 = M<
			D<{
				providers: { p1: P1; p2: P2 };
			}>
		>;

		// Positive: Should be assignable with correct providers
		expect({
			name: "Module",
			providers: { p1: P1, p2: P2 },
		}).type.toBeAssignableTo<M1>();
		// Negative: Should NOT be assignable if provider types are wrong
		expect({
			name: "Module",
			providers: { p1: true, p2: P2 },
		}).type.not.toBeAssignableTo<M1>();
		// Negative: Should NOT be assignable if provider types are wrong
		expect({
			name: "Module",
			providers: { p1: P1, p2: "" },
		}).type.not.toBeAssignableTo<M1>();
		// Negative: Should NOT be assignable if provider types are swapped
		expect({
			name: "Module",
			providers: { p1: P2, p2: P1 },
		}).type.not.toBeAssignableTo<M1>();
		// Negative: Should NOT be assignable if a provider is missing
		expect({
			name: "Module",
			providers: { p1: P1 },
		}).type.not.toBeAssignableTo<M1>();
		// Negative: Should NOT be assignable with empty providers
		expect({
			name: "Module",
			providers: {},
		}).type.not.toBeAssignableTo<M1>();
	});

	it("ensures imports in definition and declaration are the same", () => {
		type M1 = M<D<{ providers: { p1: P1 } }>>;

		type M2 = M<
			D<{
				imports: [M1];
			}>
		>;

		// Positive: Should match exact structure with M1
		expect<M2>().type.toBe<
			StaticModule<
				D<{
					imports: [StaticModule<D<{ providers: { p1: P1 } }>>];
				}>
			>
		>();
		// Negative: Should NOT be assignable if wrong provider type in imports
		expect<M2>().type.not.toBeAssignableTo<
			StaticModule<
				D<{
					imports: [StaticModule<D<{ providers: { p1: P2 } }>>];
				}>
			>
		>();
		// Negative: Should NOT be assignable with empty imports
		expect<M2>().type.not.toBeAssignableTo<
			StaticModule<
				D<{
					imports: [];
				}>
			>
		>();
		// Negative: Should NOT be assignable with no imports property
		expect<M2>().type.not.toBeAssignableTo<
			StaticModule<D<{ providers: EmptyObject }>>
		>();
	});

	it("ensures exports in definition and declaration are the same", () => {
		type M1 = M<
			D<{
				providers: { p1: P1; p2: P2 };
				exportKeys: "p1";
			}>
		>;

		// Positive: Should be assignable with correct exports
		expect({
			name: "Module",
			providers: { p1: P1, p2: P2 },
			exports: { p1: P1 },
		}).type.toBeAssignableTo<M1>();
		// Negative: Should NOT be assignable if wrong export type
		expect({
			name: "Module",
			providers: { p1: P2, p2: P2 },
			exports: { p1: P2 },
		}).type.not.toBeAssignableTo<M1>();
		// Negative: Should NOT be assignable if different key is exported
		expect({
			name: "Module",
			providers: { p1: P1, p2: P2 },
			exports: { p2: P2 },
		}).type.not.toBeAssignableTo<M1>();
		// Negative: Should NOT be assignable with no exports
		expect({
			name: "Module",
			providers: { p1: P1, p2: P2 },
		}).type.not.toBeAssignableTo<M1>();
		// Negative: Should NOT be assignable if both are exported
		expect({
			name: "Module",
			providers: { p1: P1, p2: P2 },
			exports: { p1: P1, p2: P2 },
		}).type.not.toBeAssignableTo<M1>();
	});

	it("ensures dependencies are extracted correctly in def deps including exported from imported modules", () => {
		type M1 = M<
			D<{
				providers: { p1: P1; p5: P5 };
				exportKeys: "p1";
			}>
		>;
		type M2 = M<
			D<{
				providers: { p2: P2 };
				exportKeys: "p2";
			}>
		>;
		type M3 = M<
			D<{
				providers: { p3: P3 };
			}>
		>;

		type M4Def = D<{
			providers: { p4: P4 };
			imports: [M1, M2, M3];
		}>;

		type Deps = M4Def["deps"];

		expect<Deps>().type.toBe<
			{ p4: P4 } & Pick<{ p1: P1 }, "p1"> &
				Pick<{ p2: P2 }, "p2"> &
				EmptyObject &
				CommonDependencies
		>();

		expect<{ p1: P1; p2: P2; p4: P4 }>().type.toBeAssignableTo<Deps>();
		expect<{ p1: P1; p2: P2; p4: P4; p5: P5 }>().type.toBeAssignableTo<Deps>();
		expect<{ p1: P1; p2: P2 }>().type.not.toBeAssignableTo<Deps>();
		expect<Deps>().type.not.toHaveProperty("p5");
		expect<Deps>().type.not.toHaveProperty("p3");
	});
});
