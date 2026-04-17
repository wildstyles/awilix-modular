import { createStaticModule, type ModuleDef } from "awilix-modular";
import { TenantMiddleware } from "./tenant.middleware.js";

export type TenantModuleDef = ModuleDef<{
	queryPreHandlers: {
		tenant: TenantMiddleware;
	};
	exportQueryPreHandlerKeys: "tenant";
}>;

export const TenantModule = createStaticModule<TenantModuleDef>({
	name: "TenantModule",

	queryPreHandlers: {
		tenant: TenantMiddleware,
	},

	queryPreHandlerExports: {
		tenant: { useClass: TenantMiddleware },
		// tenant: TenantMiddleware,
	},
});

type T = typeof TenantModule;
