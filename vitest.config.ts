import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		environment: "node",
		include: ["tests/**/*.test.ts"],
		coverage: {
			provider: "v8",
			reporter: ["text", "html", "json-summary"],
			include: ["src/**/*.ts"],
			exclude: [
				"src/app/**",
				"src/**/*.d.ts",
				"src/**/index.ts",
				"src/**/types.ts",
			],
		},
	},
});
