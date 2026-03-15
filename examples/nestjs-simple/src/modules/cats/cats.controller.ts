import { Controller, Get } from "@nestjs/common";

import { CatsService } from "./cats.service.js";

@Controller("cats")
export class CatsController {
	private readonly controllerInstanceId = Math.random()
		.toString(36)
		.substring(7);

	constructor(private readonly catsService: CatsService) {}

	@Get()
	getAllCats() {
		return {
			cats: this.catsService.getAllCats(),
			serviceInstanceId: this.catsService.getInstanceId(),
			controllerInstanceId: this.controllerInstanceId,
		};
	}
}
