import { describe, expect, test } from "tstyche";
import type { Contract, Handler } from "../../lib/cqrs.types.js";

describe("Contract", () => {
	test("should create a contract type with single key", () => {
		type UserContract = Contract<
			"getUser",
			{ userId: string },
			{ name: string; email: string }
		>;

		expect<UserContract>().type.toBe<{
			getUser: {
				payload: { userId: string };
				response: { name: string; email: string };
			};
		}>();
	});

	test("should support multiple keys via union", () => {
		type MultiContract = Contract<
			"getUser" | "updateUser",
			{ userId: string },
			{ name: string }
		>;

		expect<MultiContract>().type.toHaveProperty("getUser");
		expect<MultiContract>().type.toHaveProperty("updateUser");
	});

	test("should support different payload and response types", () => {
		type PaymentContract = Contract<
			"processPayment",
			{ amount: number; currency: string },
			{ transactionId: string; success: boolean }
		>;

		type PaymentPayload = PaymentContract["processPayment"]["payload"];
		type PaymentResponse = PaymentContract["processPayment"]["response"];

		expect<PaymentPayload>().type.toBe<{
			amount: number;
			currency: string;
		}>();

		expect<PaymentResponse>().type.toBe<{
			transactionId: string;
			success: boolean;
		}>();
	});

	// test("should support void payloads and responses", () => {
	// 	type VoidContract = Contract<"ping", void, void>;
	//
	// 	expect<VoidContract["ping"]["payload"]>().type.toBeVoid();
	// 	expect<VoidContract["ping"]["response"]>().type.toBeVoid();
	// });
});

describe("Handler", () => {
	test("should create handler type with correct key and executor", () => {
		type UserContract = Contract<
			"getUser",
			{ userId: string },
			{ name: string; email: string }
		>;

		type GetUserHandler = Handler<UserContract, "getUser">;

		expect<GetUserHandler>().type.toHaveProperty("key");
		expect<GetUserHandler>().type.toHaveProperty("executor");

		expect<GetUserHandler["key"]>().type.toBe<"getUser">();
	});

	test("should enforce correct executor signature", () => {
		type QueryContract = Contract<
			"searchUsers",
			{ query: string },
			{ users: Array<{ id: string; name: string }> }
		>;

		class SearchUsersHandler implements Handler<QueryContract, "searchUsers"> {
			readonly key = "searchUsers" as const;

			async executor(
				_payload: { query: string },
				_meta: Record<string, unknown>,
			): Promise<{ users: Array<{ id: string; name: string }> }> {
				expect<typeof _payload>().type.toBe<{ query: string }>();
				expect<typeof _meta>().type.toBe<Record<string, unknown>>();

				return { users: [] };
			}
		}

		const handler = new SearchUsersHandler();

		expect<typeof handler>().type.toBe<Handler<QueryContract, "searchUsers">>();
	});

	test("should infer key type when not specified", () => {
		type MultiContract = Contract<"actionA" | "actionB", unknown, unknown>;

		type GenericHandler = Handler<MultiContract>;

		// Key should be union of all possible keys
		expect<GenericHandler["key"]>().type.toBe<"actionA" | "actionB">();
	});

	test("should support handlers with different payload types", () => {
		type CommandContract = Contract<
			"createUser",
			{ name: string; email: string },
			{ id: string; success: boolean }
		>;

		class CreateUserHandler implements Handler<CommandContract, "createUser"> {
			readonly key = "createUser" as const;

			async executor(
				_payload: { name: string; email: string },
				_meta: Record<string, unknown>,
			): Promise<{ id: string; success: boolean }> {
				expect<typeof _payload>().type.toBe<{
					name: string;
					email: string;
				}>();

				return { id: "123", success: true };
			}
		}

		const handler = new CreateUserHandler();

		expect(handler).type.toBe<Handler<CommandContract, "createUser">>();
	});

	test("should support complex nested types in contract", () => {
		type ComplexContract = Contract<
			"processOrder",
			{
				orderId: string;
				items: Array<{
					productId: string;
					quantity: number;
					price: number;
				}>;
				customer: {
					id: string;
					name: string;
					address: {
						street: string;
						city: string;
						zipCode: string;
					};
				};
			},
			{
				orderNumber: string;
				total: number;
				estimatedDelivery: Date;
			}
		>;

		type OrderHandler = Handler<ComplexContract, "processOrder">;

		expect<OrderHandler["key"]>().type.toBe<"processOrder">();
	});
});
