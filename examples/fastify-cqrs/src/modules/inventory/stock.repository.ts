import inventoryData from "./inventory.data.json" with { type: "json" };

export interface StockInfo {
	bookId: string;
	totalCopies: number;
	availableCopies: number;
	checkedOut: number;
}

export class StockRepository {
	constructor() {
		console.log("[StockRepository] Created instance");
	}

	findByBookId(bookId: string): StockInfo | undefined {
		return inventoryData.stock.find((item) => item.bookId === bookId);
	}

	findAll(): StockInfo[] {
		return inventoryData.stock;
	}

	getAvailableCopies(bookId: string): number {
		const stock = this.findByBookId(bookId);
		return stock?.availableCopies ?? 0;
	}

	isAvailable(bookId: string): boolean {
		return this.getAvailableCopies(bookId) > 0;
	}
}
