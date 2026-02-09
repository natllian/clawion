import type { ChildProcess } from "node:child_process";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

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

export function resolveUiRuntimeDir(cliModuleUrl = import.meta.url): string {
	const cliDir = dirname(fileURLToPath(cliModuleUrl));
	const candidates = [resolve(cliDir, "../ui"), resolve(cliDir, "../dist/ui")];

	for (const candidate of candidates) {
		const serverEntry = resolve(candidate, "server.js");
		if (existsSync(serverEntry)) {
			return candidate;
		}
	}

	return candidates[0];
}

export function startUiServer({
	port,
	cliModuleUrl,
	runtimeDir,
	spawnProcess = spawn,
	env = process.env,
}: StartUiServerInput): StartUiServerResult {
	const targetRuntimeDir = runtimeDir ?? resolveUiRuntimeDir(cliModuleUrl);
	const serverEntry = resolve(targetRuntimeDir, "server.js");
	if (!existsSync(serverEntry)) {
		return {
			errorMessage: `Web UI runtime not found at ${serverEntry}. Reinstall the package or run "pnpm prepack".`,
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

	const child = spawnProcess("node", ["server.js"], {
		cwd: targetRuntimeDir,
		stdio: "inherit",
		env: normalizedPort ? { ...env, PORT: normalizedPort } : env,
	});

	return { child };
}
