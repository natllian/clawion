import { appendFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { nowLocal } from "../time";

type CliInvocationEntry = {
	timestamp: string;
	command: string;
};

export function resolveCliInvocationsPath(workspaceDir: string): string {
	return join(workspaceDir, "cli-invocations.jsonl");
}

export async function appendCliInvocation(
	workspaceDir: string,
	command: string,
): Promise<void> {
	const path = resolveCliInvocationsPath(workspaceDir);
	await mkdir(dirname(path), { recursive: true });

	const entry: CliInvocationEntry = {
		timestamp: nowLocal(),
		command,
	};

	await appendFile(path, `${JSON.stringify(entry)}\n`, "utf8");
}
