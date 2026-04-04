export enum HttpStatus {
	OK = 200,
	CREATED = 201,
	BAD_REQUEST = 400,
	UNAUTHORIZED = 401,
	FORBIDDEN = 403,
	NOT_FOUND = 404,
	METHOD_NOT_ALLOWED = 405,
	NOT_ACCEPTABLE = 406,
	REQUEST_TIMEOUT = 408,
	CONFLICT = 409,
	GONE = 410,
	PRECONDITION_FAILED = 412,
	PAYLOAD_TOO_LARGE = 413,
	UNSUPPORTED_MEDIA_TYPE = 415,
	I_AM_A_TEAPOT = 418,
	UNPROCESSABLE_ENTITY = 422,
	INTERNAL_SERVER_ERROR = 500,
	NOT_IMPLEMENTED = 501,
	BAD_GATEWAY = 502,
	SERVICE_UNAVAILABLE = 503,
	GATEWAY_TIMEOUT = 504,
	HTTP_VERSION_NOT_SUPPORTED = 505,
}

export class HttpException extends Error {
	constructor(
		public readonly message: string,
		public readonly statusCode: HttpStatus,
		public readonly response?: Record<string, any> | null,
	) {
		super(message);
		this.name = this.constructor.name;
		Error.captureStackTrace(this, this.constructor);
	}

	getResponse(): {
		message: string;
		statusCode: HttpStatus;
		[key: string]: any;
	} {
		return {
			message: this.message,
			statusCode: this.statusCode,
			...this.response,
		};
	}

	getStatus(): HttpStatus {
		return this.statusCode;
	}
}

export const httpException = {
	badRequest: (message = "Bad Request", response?: Record<string, any>) =>
		new HttpException(message, HttpStatus.BAD_REQUEST, response),

	unauthorized: (message = "Unauthorized", response?: Record<string, any>) =>
		new HttpException(message, HttpStatus.UNAUTHORIZED, response),

	forbidden: (message = "Forbidden", response?: Record<string, any>) =>
		new HttpException(message, HttpStatus.FORBIDDEN, response),

	notFound: (message = "Not Found", response?: Record<string, any>) =>
		new HttpException(message, HttpStatus.NOT_FOUND, response),

	methodNotAllowed: (
		message = "Method Not Allowed",
		response?: Record<string, any>,
	) => new HttpException(message, HttpStatus.METHOD_NOT_ALLOWED, response),

	notAcceptable: (message = "Not Acceptable", response?: Record<string, any>) =>
		new HttpException(message, HttpStatus.NOT_ACCEPTABLE, response),

	requestTimeout: (
		message = "Request Timeout",
		response?: Record<string, any>,
	) => new HttpException(message, HttpStatus.REQUEST_TIMEOUT, response),

	conflict: (message = "Conflict", response?: Record<string, any>) =>
		new HttpException(message, HttpStatus.CONFLICT, response),

	gone: (message = "Gone", response?: Record<string, any>) =>
		new HttpException(message, HttpStatus.GONE, response),

	preconditionFailed: (
		message = "Precondition Failed",
		response?: Record<string, any>,
	) => new HttpException(message, HttpStatus.PRECONDITION_FAILED, response),

	payloadTooLarge: (
		message = "Payload Too Large",
		response?: Record<string, any>,
	) => new HttpException(message, HttpStatus.PAYLOAD_TOO_LARGE, response),

	unsupportedMediaType: (
		message = "Unsupported Media Type",
		response?: Record<string, any>,
	) => new HttpException(message, HttpStatus.UNSUPPORTED_MEDIA_TYPE, response),

	imATeapot: (message = "I'm a teapot", response?: Record<string, any>) =>
		new HttpException(message, HttpStatus.I_AM_A_TEAPOT, response),

	unprocessableEntity: (
		message = "Unprocessable Entity",
		response?: Record<string, any>,
	) => new HttpException(message, HttpStatus.UNPROCESSABLE_ENTITY, response),

	internalServerError: (
		message = "Internal Server Error",
		response?: Record<string, any>,
	) => new HttpException(message, HttpStatus.INTERNAL_SERVER_ERROR, response),

	notImplemented: (
		message = "Not Implemented",
		response?: Record<string, any>,
	) => new HttpException(message, HttpStatus.NOT_IMPLEMENTED, response),

	badGateway: (message = "Bad Gateway", response?: Record<string, any>) =>
		new HttpException(message, HttpStatus.BAD_GATEWAY, response),

	serviceUnavailable: (
		message = "Service Unavailable",
		response?: Record<string, any>,
	) => new HttpException(message, HttpStatus.SERVICE_UNAVAILABLE, response),

	gatewayTimeout: (
		message = "Gateway Timeout",
		response?: Record<string, any>,
	) => new HttpException(message, HttpStatus.GATEWAY_TIMEOUT, response),

	httpVersionNotSupported: (
		message = "HTTP Version Not Supported",
		response?: Record<string, any>,
	) =>
		new HttpException(message, HttpStatus.HTTP_VERSION_NOT_SUPPORTED, response),
};
