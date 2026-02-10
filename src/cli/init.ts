import { existsSync } from "node:fs";
import { copyFile, mkdir, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { resolvePackageRootDir } from "./runtime-paths";

type EnvMap = Record<string, string | undefined>;

type InitInput = {
	cliModuleUrl?: string;
	env?: EnvMap;
	systemHomeDir?: string;
	skillSourcePath?: string;
};

type InitResult = {
	configPath: string;
	workspaceDir: string;
	targetPath: string;
};

export function resolveOpenClawConfigPath(
	env: EnvMap = process.env,
	systemHomeDir = homedir(),
): string {
	const exactConfigPath = env.OPENCLAW_CONFIG_PATH?.trim();
	if (exactConfigPath) {
		return exactConfigPath;
	}

	const stateDir = env.OPENCLAW_STATE_DIR?.trim();
	if (stateDir) {
		return join(stateDir, "openclaw.json");
	}

	const openClawHome = env.OPENCLAW_HOME?.trim() || systemHomeDir;
	return join(openClawHome, ".openclaw", "openclaw.json");
}

function readWorkspaceDirFromConfig(rawConfig: string): string {
	let parsed: unknown;
	try {
		parsed = JSON.parse(rawConfig);
	} catch (error) {
		throw new Error(
			`Failed to parse OpenClaw config JSON: ${error instanceof Error ? error.message : String(error)}`,
		);
	}

	if (!parsed || typeof parsed !== "object") {
		throw new Error("OpenClaw config is invalid: expected a JSON object.");
	}

	const workspaceDir = (
		parsed as {
			agents?: {
				defaults?: {
					workspace?: string;
				};
			};
		}
	).agents?.defaults?.workspace;

	if (!workspaceDir || workspaceDir.trim().length === 0) {
		throw new Error(
			"OpenClaw config is missing agents.defaults.workspace. Please set it in openclaw.json first.",
		);
	}

	return workspaceDir.trim();
}

export async function runInit({
	cliModuleUrl,
	env = process.env,
	systemHomeDir,
	skillSourcePath,
}: InitInput = {}): Promise<InitResult> {
	const configPath = resolveOpenClawConfigPath(env, systemHomeDir);
	if (!existsSync(configPath)) {
		throw new Error(
			`OpenClaw config not found: ${configPath}. Please create it or set OPENCLAW_CONFIG_PATH.`,
		);
	}

	const rawConfig = await readFile(configPath, "utf8");
	const workspaceDir = readWorkspaceDirFromConfig(rawConfig);

	const packageRootDir = resolvePackageRootDir(cliModuleUrl);
	const sourcePath =
		skillSourcePath ?? join(packageRootDir, "skills", "clawion", "SKILL.md");
	if (!existsSync(sourcePath)) {
		throw new Error(
			`Built-in skill file not found: ${sourcePath}. Reinstall clawion package.`,
		);
	}

	const targetDir = join(workspaceDir, "skills", "clawion");
	const targetPath = join(targetDir, "SKILL.md");
	await mkdir(targetDir, { recursive: true });
	await copyFile(sourcePath, targetPath);

	return {
		configPath,
		workspaceDir,
		targetPath,
	};
}
