import type { ChildProcess } from "node:child_process";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { resolvePackageRootDir } from "./runtime-paths";

type SpawnProcess = (
	command: string,
	args: string[],
	options: {
		cwd: string;
		stdio: "inherit";
		env: NodeJS.ProcessEnv;
	},
) => ChildProcess;

type StartUiServerInput = {
	port?: number | string;
	cliModuleUrl?: string;
	runtimeDir?: string;
	packageRootDir?: string;
	nextBinPath?: string;
	spawnProcess?: SpawnProcess;
	env?: NodeJS.ProcessEnv;
};

type StartUiServerResult = {
	child?: ChildProcess;
	errorMessage?: string;
};

function ensurePort(port?: number | string): string | undefined {
	if (port === undefined) {
		return undefined;
	}

	const value = String(port).trim();
	if (!/^\d+$/.test(value)) {
		throw new Error(
			`Invalid port "${value}". Expected an integer between 1 and 65535.`,
		);
	}

	const parsed = Number(value);
	if (parsed < 1 || parsed > 65535) {
		throw new Error(
			`Invalid port "${value}". Expected an integer between 1 and 65535.`,
		);
	}

	return String(parsed);
}

function hasBuiltUi(runtimeDir: string): boolean {
	return existsSync(resolve(runtimeDir, ".next/BUILD_ID"));
}

export function resolveUiRuntimeDir(cliModuleUrl = import.meta.url): string {
	const packageRootDir = resolvePackageRootDir(cliModuleUrl);
	const candidates = [resolve(packageRootDir, "dist/ui"), packageRootDir];

	for (const candidate of candidates) {
		if (hasBuiltUi(candidate)) {
			return candidate;
		}
	}

	return candidates[0];
}

function resolveNextBinPath(packageRootDir: string): string | undefined {
	let currentDir = packageRootDir;
	for (let i = 0; i < 8; i += 1) {
		const candidate = resolve(currentDir, "node_modules/next/dist/bin/next");
		if (existsSync(candidate)) {
			return candidate;
		}

		const parentDir = resolve(currentDir, "..");
		if (parentDir === currentDir) {
			break;
		}
		currentDir = parentDir;
	}

	return undefined;
}

export function startUiServer({
	port,
	cliModuleUrl,
	runtimeDir,
	packageRootDir,
	nextBinPath,
	spawnProcess = spawn,
	env = process.env,
}: StartUiServerInput): StartUiServerResult {
	const targetPackageRootDir =
		packageRootDir ?? resolvePackageRootDir(cliModuleUrl);
	const targetRuntimeDir = runtimeDir ?? resolveUiRuntimeDir(cliModuleUrl);
	const buildIdPath = resolve(targetRuntimeDir, ".next/BUILD_ID");
	if (!hasBuiltUi(targetRuntimeDir)) {
		return {
			errorMessage: `Web UI build output not found at ${buildIdPath}. Reinstall the package or run "pnpm prepack".`,
		};
	}

	const targetNextBinPath =
		nextBinPath ?? resolveNextBinPath(targetPackageRootDir);
	if (!targetNextBinPath) {
		return {
			errorMessage: `Next.js CLI not found from ${targetPackageRootDir}. Reinstall dependencies.`,
		};
	}

	let normalizedPort: string | undefined;
	try {
		normalizedPort = ensurePort(port);
	} catch (error) {
		return {
			errorMessage: error instanceof Error ? error.message : String(error),
		};
	}

	const args = [targetNextBinPath, "start", targetRuntimeDir];
	if (normalizedPort) {
		args.push("-p", normalizedPort);
	}

	const child = spawnProcess(process.execPath, args, {
		cwd: targetPackageRootDir,
		stdio: "inherit",
		env,
	});

	return { child };
}
