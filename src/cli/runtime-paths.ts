import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function resolvePackageRootDir(cliModuleUrl = import.meta.url): string {
	const cliDir = dirname(fileURLToPath(cliModuleUrl));
	const candidates = [resolve(cliDir, "../.."), resolve(cliDir, "..")];

	for (const candidate of candidates) {
		if (existsSync(join(candidate, "package.json"))) {
			return candidate;
		}
	}

	return candidates[0];
}
