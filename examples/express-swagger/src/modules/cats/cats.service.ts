import type { CatsServiceResponse } from "./get-cats.dto.js";

export class CatsService {
	private readonly instanceId = Math.random().toString(36).substring(7);

	getInstanceId(): string {
		return this.instanceId;
	}

	getCats(): CatsServiceResponse {
		return {
			catsServiceId: this.getInstanceId(),
		};
	}
}
