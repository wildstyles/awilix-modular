import { describe, expect, it } from "tstyche";

import type {
	ModuleDef as D,
	Module as M,
	StaticModule,
} from "../../lib/di-context.types.js";

describe("Module", () => {
	class P1 {
		private declare readonly __brand;
	}
	// class P2 {
	// 	private declare readonly __brand;
	// }

	it("ensures imports in definition and declaration are the same", () => {
		type M1 = M<D<{ providers: { p1: P1 } }>>;

		type M2 = M<
			D<{
				imports: [M1];
			}>
		>;

		expect<M2>().type.toBe<
			StaticModule<
				D<{
					imports: [StaticModule<D<{ providers: { p1: P1 } }>>];
				}>
			>
		>();
	});
});
