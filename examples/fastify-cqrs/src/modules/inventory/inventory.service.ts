import type { Deps } from "./inventory.module.js";

export class InventoryService {
	constructor(private readonly stockRepository: Deps["stockRepository"]) {
		console.log(
			"[InventoryService] Created with stockRepository:",
			!!stockRepository,
		);
	}

	getStockInfo(bookId: string) {
		return this.stockRepository.findByBookId(bookId);
	}

	isBookAvailable(bookId: string): boolean {
		return this.stockRepository.isAvailable(bookId);
	}

	getAvailabilityStatus(bookId: string): {
		available: boolean;
		availableCopies: number;
		totalCopies: number;
	} {
		const stock = this.stockRepository.findByBookId(bookId);

		if (!stock) {
			return {
				available: false,
				availableCopies: 0,
				totalCopies: 0,
			};
		}

		return {
			available: stock.availableCopies > 0,
			availableCopies: stock.availableCopies,
			totalCopies: stock.totalCopies,
		};
	}

	getAllStockLevels() {
		return this.stockRepository.findAll();
	}
}
