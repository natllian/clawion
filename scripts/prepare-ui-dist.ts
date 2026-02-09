import { existsSync } from "node:fs";
import { cp, mkdir, rm } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");
const uiDistDir = resolve(repoRoot, "dist/ui");
const standaloneDir = resolve(repoRoot, ".next/standalone");
const staticDir = resolve(repoRoot, ".next/static");
const publicDir = resolve(repoRoot, "public");

async function prepareUiDist() {
	if (!existsSync(standaloneDir)) {
		throw new Error(
			`Next standalone output not found at ${standaloneDir}. Run "pnpm build:ui" first.`,
		);
	}

	await rm(uiDistDir, { force: true, recursive: true });
	await mkdir(uiDistDir, { recursive: true });

	await cp(standaloneDir, uiDistDir, { recursive: true });

	if (existsSync(staticDir)) {
		await mkdir(join(uiDistDir, ".next"), { recursive: true });
		await cp(staticDir, join(uiDistDir, ".next/static"), { recursive: true });
	}

	if (existsSync(publicDir)) {
		await cp(publicDir, join(uiDistDir, "public"), { recursive: true });
	}
}

prepareUiDist().catch((error) => {
	const message = error instanceof Error ? error.message : String(error);
	console.error(message);
	process.exit(1);
});
