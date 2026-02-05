import { appendFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";

type CliInvocationEntry = {
	timestamp: string;
	command: string;
};

function nowIso(): string {
	return new Date().toISOString();
}

export function resolveCliInvocationsPath(missionsDir: string): string {
	return join(missionsDir, "cli-invocations.jsonl");
}

export async function appendCliInvocation(
	missionsDir: string,
	command: string,
): Promise<void> {
	const path = resolveCliInvocationsPath(missionsDir);
	await mkdir(dirname(path), { recursive: true });

	const entry: CliInvocationEntry = {
		timestamp: nowIso(),
		command,
	};

	await appendFile(path, `${JSON.stringify(entry)}\n`, "utf8");
}
