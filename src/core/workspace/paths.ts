import { homedir } from "node:os";
import { join } from "node:path";

export const MISSIONS_DIR_ENV = "CLAWION_MISSIONS_DIR";

export function resolveMissionsDir(override?: string): string {
	if (override?.trim()) {
		return override;
	}

	const envPath = process.env[MISSIONS_DIR_ENV];
	if (envPath?.trim()) {
		return envPath;
	}

	return join(homedir(), ".clawion", "missions");
}
