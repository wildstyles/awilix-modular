import { GET, schema, HttpStatus } from "awilix-modular";
import type { Request, Reply } from "@/types.js";

import type { Deps } from "./owners.module.js";
import { GetOwnersSchema } from "./get-owners.dto.js";

export class OwnersController {
	constructor(private readonly queryMediator: Deps["queryMediator"]) {}

	@GET("/owners")
	@schema(GetOwnersSchema)
	async getCats(
		req: Request<typeof GetOwnersSchema>,
		res: Reply<typeof GetOwnersSchema>,
	) {
		const result = await this.queryMediator.execute(
			"owners/get-owners",
			req.query,
			req.context,
		);

		res.status(HttpStatus.OK).send({
			handlerId: result.handlerId,
		});
	}
}
