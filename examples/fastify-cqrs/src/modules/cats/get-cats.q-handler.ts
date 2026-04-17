import { type Contract, type Handler, Result } from "awilix-modular";
import type { Deps, QueryHandlerExecuteScenario } from "./cats.module.js";
import type {
	GetCatsQuery as Payload,
	GetCatsResult as SuccessResponse,
} from "./get-cats.dto.js";
import { CatsNotFoundError } from "@/errors.js";

// Handler defines ONLY its own error type
type Response = Result<SuccessResponse, CatsNotFoundError>;
// type Response = SuccessResponse;

type Scenarios =
	| QueryHandlerExecuteScenario<{
			name: "public";
			excludePreHandlers: ["auth", "tenant", "logging"];
	  }>
	| QueryHandlerExecuteScenario<{
			// includePreHandlers: ["tenant"];
			name: "authorized";
	  }>;

type Context = Scenarios["context"];

export class GetCatsQueryHandler
	implements Handler<GetCatsQueryHandler["contract"], Context, Scenarios>
{
	readonly key = "cats/get-cats";
	declare readonly contract: Contract<typeof this.key, Payload, Response>;
	declare readonly executeScenarios: Scenarios;

	private readonly instanceId = Math.random().toString(36).substring(7);

	constructor(
		private readonly catsService: Deps["catsService"],
		private readonly dogsService: Deps["dogsService"],
	) {}

	async executor(payload: Payload, context: Context): Promise<Response> {
		console.log(context, "CONTExt");
		const { userId, roles } = this.normalizeContext(context);

		// context is auto-typed from module's queryPreHandlers
		// You get autocomplete for: context.userId, context.roles
		console.log(
			`[GetCatsQueryHandler] User ${userId} with roles ${roles.join(", ")}`,
		);

		const cats = this.catsService.getCats();

		// return {
		// 	handlerId: this.instanceId,
		// 	dogsServiceId: this.dogsService.getInstanceId(),
		// 	catsServiceId: this.catsService.getInstanceId(),
		// 	dogsService: this.dogsService.getDogs(),
		// 	catsService: cats,
		// };

		// Simulate no cats found scenario
		if (!cats || userId === "no-cats-user") {
			console.log(`[GetCatsQueryHandler] No cats found for user ${userId}`);
			// Return error - this is the ONLY error the handler defines
			return Result.error(new CatsNotFoundError(userId));
		}

		// Return success
		return Result.ok({
			handlerId: this.instanceId,
			dogsServiceId: this.dogsService.getInstanceId(),
			catsServiceId: this.catsService.getInstanceId(),
			dogsService: this.dogsService.getDogs(),
			catsService: cats,
		});
	}

	private normalizeContext(context: Context): {
		userId: string;
		roles: string[];
	} {
		return {
			userId: this.hasUserId(context) ? context.userId : "anonymous",
			roles: this.hasRoles(context) ? context.roles : [],
		};
	}

	private hasRoles(context: Context): context is Context & { roles: string[] } {
		return (
			"roles" in context &&
			Array.isArray((context as { roles?: unknown }).roles)
		);
	}

	private hasUserId(context: Context): context is Context & { userId: string } {
		return (
			"userId" in context &&
			typeof (context as { userId?: unknown }).userId === "string"
		);
	}
}
