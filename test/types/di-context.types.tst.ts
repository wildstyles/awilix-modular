import { describe, expect, it } from "tstyche";

import type {
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
});
