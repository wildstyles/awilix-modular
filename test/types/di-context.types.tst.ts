import { describe, expect, it } from "tstyche";

import type {
	CommonDependencies,
	ModuleDef as D,
	EmptyObject,
	Module as M,
	StaticModule,
} from "../../lib/di-context.types.js";

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

	it("ensures factory providers", () => {});
	// prevent { p1: '' } to be allowed
	// dynamic modules the same
	it("ensures different provider variants", () => {});

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
