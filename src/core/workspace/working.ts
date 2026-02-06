import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { appendJsonLine, readJsonLines } from "../fs/jsonl";
import { type WorkingEvent, workingEventSchema } from "../schemas";
import { nowLocal } from "../time";
import { resolveMissionPath } from "./mission";

type WorkingAddInput = {
	missionsDir: string;
	missionId: string;
	agentId: string;
	content: string;
};

function nowIso(): string {
	return nowLocal();
}

function resolveWorkingPath(missionPath: string, agentId: string): string {
	return join(missionPath, "working", `${agentId}.jsonl`);
}

export async function appendWorkingEvent(
	input: WorkingAddInput,
): Promise<WorkingEvent> {
	const missionPath = await resolveMissionPath(
		input.missionsDir,
		input.missionId,
	);
	const entry = workingEventSchema.parse({
		id: randomUUID(),
		createdAt: nowIso(),
		agentId: input.agentId,
		content: input.content,
	});

	await appendJsonLine(resolveWorkingPath(missionPath, input.agentId), entry);
	return entry;
}

export async function listWorkingEvents(
	missionsDir: string,
	missionId: string,
	agentId: string,
): Promise<WorkingEvent[]> {
	const missionPath = await resolveMissionPath(missionsDir, missionId);
	return readJsonLines(
		resolveWorkingPath(missionPath, agentId),
		workingEventSchema,
	);
}
