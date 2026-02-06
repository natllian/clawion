import { homedir } from "node:os";
import { join } from "node:path";

/**
 * Root workspace directory.
 *
 * Default: `~/.clawion`
 */
export const WORKSPACE_ENV = "CLAWION_WORKSPACE";

export function resolveWorkspaceDir(override?: string): string {
	if (override?.trim()) {
		return override;
	}

	const envPath = process.env[WORKSPACE_ENV];
	if (envPath?.trim()) {
		return envPath;
	}

	return join(homedir(), ".clawion");
}

// Missions live under `${CLAWION_WORKSPACE}/missions`.
export function resolveMissionsDir(): string {
	return join(resolveWorkspaceDir(), "missions");
}
