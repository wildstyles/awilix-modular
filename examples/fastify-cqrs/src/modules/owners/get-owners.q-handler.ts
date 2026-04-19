import type { QueryContract, Handler } from "awilix-modular";
import type {
	GetOwnersQuery as Payload,
	GetOwnersResponse as Response,
} from "./get-owners.dto.js";

export class GetOwnersQueryHandler
	implements Handler<GetOwnersQueryHandler["contract"]>
{
	readonly key = "owners/get-owners";
	declare readonly contract: QueryContract<typeof this.key, Payload, Response>;

	private readonly instanceId = Math.random().toString(36).substring(7);

	async executor(payload: Payload): Promise<Response> {
		return {
			handlerId: this.instanceId,
		};
	}
}
