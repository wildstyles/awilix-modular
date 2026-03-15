import { Injectable } from "@nestjs/common";

@Injectable()
export class Owners1Service {
	// NOTE: this provider exists to show one directional provider dep
	// between circular depandant modules(registered in "CatsService")
	constructor() {}
}
