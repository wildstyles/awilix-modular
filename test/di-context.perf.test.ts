import { describe, expect, it } from "vitest";
import { DIContext } from "../lib/di-context.js";
import { type AnyModule, createStaticModule } from "../lib/di-context.types.js";

describe("DIContext Performance", () => {
	const measure = (name: string, fn: () => void) => {
		const start = performance.now();
		fn();
		const duration = performance.now() - start;
		console.log(`${name}: ${duration.toFixed(2)}ms`);
		return duration;
	};

	it("should handle 250 modules in 4-level tree (100 root, each imports 10, 4 levels deep)", () => {
		const createModule = (
			level: number,
			index: number,
			childModules: AnyModule[],
		) => {
			const name = `L${level}-Module-${index}`;
			const providers = [...Array(15)].reduce((acc, _, i) => {
				acc[`${name}-provider-${i}`] = class Provider {
					level = level;
					moduleId = index;
					serviceId = i;
				};

				return acc;
			}, {});
			const exports = [...Array(10)].reduce((acc, _, i) => {
				acc[`${name}-exported-${i}`] = class ExportedProvider {
					level = level;
					moduleId = index;
					serviceId = i;
				};

				return acc;
			}, {});

			return createStaticModule<any>({
				name,
				providers,
				exports,
				imports: childModules.length > 0 ? childModules : [],
			});
		};

		// Build tree from bottom up (level 4 to level 1)
		// Level 4: 50 modules (leaves, no children) × 15 providers = 750 providers
		const level4Modules = [...Array(50)].map((_, i) => createModule(4, i, []));

		// Level 3: 50 modules × 15 providers = 750 providers, each imports 10 from level 4
		const level3Modules = [...Array(50)].map((_, i) => {
			const children = [...Array(10)].map((_, j) => {
				const childIndex = (i * 10 + j) % 50;
				return level4Modules[childIndex];
			});

			return createModule(3, i, children);
		});

		// Level 2: 50 modules × 15 providers = 750 providers, each imports 10 from level 3
		const level2Modules = [...Array(50)].map((_, i) => {
			const children = [...Array(10)].map((_, j) => {
				const childIndex = (i * 10 + j) % 50;
				return level3Modules[childIndex];
			});

			return createModule(2, i, children);
		});

		// Level 1: 100 modules × 15 providers = 1,500 providers, each imports 10 from level 2
		const level1Modules = [...Array(100)].map((_, i) => {
			const children = [...Array(10)].map((_, j) => {
				const childIndex = (i * 10 + j) % 50;
				return level2Modules[childIndex];
			});

			return createModule(1, i, children);
		});

		const duration = measure(
			"Register 250 modules × 15 providers (100+50+50+50, 4 levels deep)",
			() => {
				const diContext = new DIContext();

				diContext.registerModule({ name: "Root", imports: level1Modules });
			},
		);

		// 250 modules × 15 providers = 3,750 providers total
		expect(duration).toBeLessThan(35000);
		console.log(`  ⚡ ${(duration / 3750).toFixed(3)}ms per provider`);
		console.log(`  📦 ${(duration / 250).toFixed(2)}ms per module`);
	}, 40000);
});
