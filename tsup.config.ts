import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["bin/clawion.ts"],
	format: ["esm"],
	platform: "node",
	target: "node22",
	outDir: "dist/bin",
	clean: true,
});
