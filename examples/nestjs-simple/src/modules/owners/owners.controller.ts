import { Controller, Get } from "@nestjs/common";

import { OwnersService } from "./owners.service.js";

@Controller("owners")
export class OwnersController {
	constructor(private readonly ownersService: OwnersService) {}

	@Get()
	getAllOwners() {
		return {
			owners: this.ownersService.getAllOwners(),
		};
	}
}
