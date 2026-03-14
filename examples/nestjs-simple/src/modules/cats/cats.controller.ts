import { Controller, Get, Param, Scope } from "@nestjs/common";
import { CatsService } from "./cats.service.js";
import { DogsService } from "./dogs.service.js";

@Controller("cats")
// @Controller({ scope: Scope.TRANSIENT, path: "cats" })
export class CatsController {
	private readonly controllerInstanceId = Math.random()
		.toString(36)
		.substring(7);

	constructor(
    private readonly catsService: CatsService,
    // private readonly dogsService: DogsService
  ) {
		console.log(
			`[CatsController] created instance: ${this.controllerInstanceId}, injected CatsService: ${this.catsService.getInstanceId()}`,
		);
	}

	@Get()
	getAllCats() {
		console.log(
			`[CatsController] GET /cats - Controller: ${this.controllerInstanceId}, Service: ${this.catsService.getInstanceId()}`,
		);
		return {
			cats: this.catsService.getAllCats(),
			serviceInstanceId: this.catsService.getInstanceId(),
			controllerInstanceId: this.controllerInstanceId,
		};
	}

	@Get(":id")
	getCat(@Param("id") id: string) {
		console.log(
			`[CatsController] GET /cats/${id} - Controller: ${this.controllerInstanceId}, Service: ${this.catsService.getInstanceId()}`,
		);
		return {
			cat: this.catsService.getCatById(Number(id)),
			serviceInstanceId: this.catsService.getInstanceId(),
			controllerInstanceId: this.controllerInstanceId,
		};
	}
}
