import type { Contract, Handler, MetaFromTags } from "awilix-modular";
import type { Deps } from "./cats.module.js";
import type {
	GetCatsQuery as Payload,
	GetCatsResult as Response,
} from "./get-cats.dto.js";

export const QUERY_KEY = "cats/get-cats";

type GetCatsQueryContract = typeof GetCatsQueryHandler.contract;

export class GetCatsQueryHandler implements Handler<GetCatsQueryContract> {
	readonly key = QUERY_KEY;
	static contract: Contract<typeof QUERY_KEY, Payload, Response>;
	private readonly instanceId = Math.random().toString(36).substring(7);

	// Single source of truth - all types are inferred from this
	readonly middlewareTags = ["tenant", "logging", "auth"] as const;
	readonly excludeMiddlewareTags = ["logging"] as const;

	constructor(
		private readonly catsService: Deps["catsService"],
		private readonly dogsService: Deps["dogsService"],
	) {}

	async executor(
		payload: Payload,
		meta: MetaFromTags<
			typeof this.middlewareTags,
			typeof this.excludeMiddlewareTags
		>,
	): Promise<Response> {
		// meta is now typed as auth + tenant (logging is excluded)
		// You get autocomplete for: meta.userId, meta.roles, meta.tenantId, meta.tenantName
		// But NOT meta.requestId or meta.timestamp (logging was excluded)
		console.log(
			`[GetCatsQueryHandler] User ${meta.userId} from tenant ${meta.tenantId}`,
		);

		return {
			handlerId: this.instanceId,
			dogsServiceId: this.dogsService.getInstanceId(),
			catsServiceId: this.catsService.getInstanceId(),
			dogsService: this.dogsService.getDogs(),
			catsService: this.catsService.getCats(),
		};
	}
}
