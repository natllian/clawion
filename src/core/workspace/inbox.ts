import { join } from "node:path";
import { appendJsonLine, readJsonLines } from "../fs/jsonl";
import { type InboxAckEvent, inboxAckEventSchema } from "../schemas";
import { nowLocal } from "../time";
import { resolveMissionPath } from "./mission";

type InboxAckInput = {
	missionsDir: string;
	missionId: string;
	agentId: string;
	messageId: string;
	taskId?: string;
};

function nowIso(): string {
	return nowLocal();
}

function resolveInboxPath(missionPath: string, agentId: string): string {
	return join(missionPath, "inbox", `${agentId}.jsonl`);
}

export async function appendInboxAck(
	input: InboxAckInput,
): Promise<InboxAckEvent> {
	const missionPath = await resolveMissionPath(
		input.missionsDir,
		input.missionId,
	);
	const entry = inboxAckEventSchema.parse({
		type: "ack",
		ackedAt: nowIso(),
		missionId: input.missionId,
		agentId: input.agentId,
		messageId: input.messageId,
		taskId: input.taskId,
	});

	await appendJsonLine(resolveInboxPath(missionPath, input.agentId), entry);
	return entry;
}

export async function listInboxAcks(
	missionsDir: string,
	missionId: string,
	agentId: string,
): Promise<InboxAckEvent[]> {
	const missionPath = await resolveMissionPath(missionsDir, missionId);
	return readJsonLines(
		resolveInboxPath(missionPath, agentId),
		inboxAckEventSchema,
	);
}
