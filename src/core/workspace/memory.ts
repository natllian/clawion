import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { writeMarkdownAtomic } from "../fs/markdown";
import { pathExists } from "../fs/util";
import { resolveMissionPath } from "./mission";

type MemorySetInput = {
	missionsDir: string;
	missionId: string;
	agentId: string;
	content: string;
};

function resolveMemoryPath(missionPath: string, agentId: string): string {
	return join(missionPath, "memory", `${agentId}.md`);
}

export async function readMemory(
	missionsDir: string,
	missionId: string,
	agentId: string,
): Promise<string> {
	const missionPath = await resolveMissionPath(missionsDir, missionId);
	const memoryPath = resolveMemoryPath(missionPath, agentId);
	if (!(await pathExists(memoryPath))) {
		return "";
	}
	return readFile(memoryPath, "utf8");
}

export async function setMemory(input: MemorySetInput): Promise<void> {
	const missionPath = await resolveMissionPath(
		input.missionsDir,
		input.missionId,
	);
	await writeMarkdownAtomic(
		resolveMemoryPath(missionPath, input.agentId),
		input.content,
	);
}
