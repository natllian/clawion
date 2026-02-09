import { existsSync } from "node:fs";
import { cp, mkdir, readdir, rm } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");
const uiDistDir = resolve(repoRoot, "dist/ui");
const nextBuildDir = resolve(repoRoot, ".next");
const publicDir = resolve(repoRoot, "public");

const REQUIRED_NEXT_ENTRIES = [
	"BUILD_ID",
	"app-path-routes-manifest.json",
	"build-manifest.json",
	"package.json",
	"prerender-manifest.json",
	"required-server-files.json",
	"routes-manifest.json",
	"server",
	"static",
] as const;

async function removeSourceMaps(rootDir: string) {
	if (!existsSync(rootDir)) {
		return;
	}

	const queue = [rootDir];
	while (queue.length > 0) {
		const currentDir = queue.pop();
		if (!currentDir) {
			continue;
		}

		const entries = await readdir(currentDir, { withFileTypes: true });
		for (const entry of entries) {
			const fullPath = join(currentDir, entry.name);
			if (entry.isDirectory()) {
				queue.push(fullPath);
				continue;
			}

			if (entry.isFile() && entry.name.endsWith(".map")) {
				await rm(fullPath, { force: true });
			}
		}
	}
}

async function prepareUiDist() {
	if (!existsSync(nextBuildDir)) {
		throw new Error(
			`Next build output not found at ${nextBuildDir}. Run "pnpm build:ui" first.`,
		);
	}

	await rm(uiDistDir, { force: true, recursive: true });
	await mkdir(uiDistDir, { recursive: true });

	const uiNextDir = join(uiDistDir, ".next");
	await mkdir(uiNextDir, { recursive: true });

	for (const entry of REQUIRED_NEXT_ENTRIES) {
		const sourcePath = join(nextBuildDir, entry);
		if (!existsSync(sourcePath)) {
			continue;
		}

		await cp(sourcePath, join(uiNextDir, entry), { recursive: true });
	}

	await rm(join(uiNextDir, "cache"), { force: true, recursive: true });
	await rm(join(uiNextDir, "dev"), { force: true, recursive: true });
	await rm(join(uiNextDir, "build"), { force: true, recursive: true });
	await rm(join(uiNextDir, "types"), { force: true, recursive: true });
	await rm(join(uiNextDir, "trace"), { force: true, recursive: true });
	await rm(join(uiNextDir, "trace-build"), { force: true, recursive: true });
	await rm(join(uiNextDir, "turbopack"), { force: true, recursive: true });
	await removeSourceMaps(uiNextDir);

	if (existsSync(publicDir)) {
		await cp(publicDir, join(uiDistDir, "public"), { recursive: true });
	}
}

prepareUiDist().catch((error) => {
	const message = error instanceof Error ? error.message : String(error);
	console.error(message);
	process.exit(1);
});
