export function isFactoryProvider(provider) {
	return (
		typeof provider === "object" &&
		provider !== null &&
		"useFactory" in provider
	);
}
export function isResolver(provider) {
	return (
		typeof provider === "object" && provider !== null && "resolve" in provider
	);
}
export function createFactoryProvider() {
	return (provider) => {
		return provider;
	};
}
//# sourceMappingURL=di-context.types.js.map
