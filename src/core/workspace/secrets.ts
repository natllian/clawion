import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { writeMarkdownAtomic } from "../fs/markdown";
import { pathExists } from "../fs/util";
import { resolveMissionPath } from "./mission";

type SecretSetInput = {
	missionsDir: string;
	missionId: string;
	agentId: string;
	content: string;
};

function resolveSecretPath(missionPath: string, agentId: string): string {
	return join(missionPath, "secrets", `${agentId}.md`);
}

export async function readAgentSecret(
	missionsDir: string,
	missionId: string,
	agentId: string,
): Promise<string> {
	const missionPath = await resolveMissionPath(missionsDir, missionId);
	const secretPath = resolveSecretPath(missionPath, agentId);
	if (!(await pathExists(secretPath))) {
		return "";
	}
	return readFile(secretPath, "utf8");
}

export async function setAgentSecret(input: SecretSetInput): Promise<void> {
	const missionPath = await resolveMissionPath(
		input.missionsDir,
		input.missionId,
	);
	await writeMarkdownAtomic(
		resolveSecretPath(missionPath, input.agentId),
		input.content,
	);
}
