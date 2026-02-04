import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [react()],
	test: {
		environment: "jsdom",
		setupFiles: ["./tests/setup.ts"],
		include: [
			"src/**/*.{test,spec}.{js,ts,jsx,tsx}",
			"tests/**/*.test.{ts,js}",
		],
		coverage: {
			provider: "v8",
			reporter: ["text", "html", "json-summary"],
			include: ["src/**/*.ts", "src/**/*.tsx"],
			exclude: [
				"src/app/**",
				"src/**/*.d.ts",
				"src/**/index.ts",
				"src/**/types.ts",
				"src/bin/**",
			],
		},
	},
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
});
