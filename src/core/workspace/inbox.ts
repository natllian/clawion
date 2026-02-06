import { join } from "node:path";
import { appendJsonLine, readJsonLines } from "../fs/jsonl";
import { type InboxAckEvent, inboxAckEventSchema } from "../schemas";
import { nowLocal } from "../time";
import { resolveMissionPath } from "./mission";
import { listThreadMessages } from "./threads";

type InboxAckInput = {
	missionsDir: string;
	missionId: string;
	agentId: string;
	messageId: string;
	taskId?: string;
};

export type UnackedTaskMention = {
	messageId: string;
	authorAgentId: string;
	createdAt: string;
	unackedAgentIds: string[];
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

export async function listUnackedTaskMentions(
	missionsDir: string,
	missionId: string,
	taskId: string,
): Promise<UnackedTaskMention[]> {
	const messages = await listThreadMessages(missionsDir, missionId, taskId);
	if (messages.length === 0) {
		return [];
	}

	const mentionedAgentIds = new Set<string>();
	for (const message of messages) {
		for (const agentId of message.mentionsAgentIds) {
			mentionedAgentIds.add(agentId);
		}
	}

	const ackedMessageIdsByAgent = new Map<string, Set<string>>();
	await Promise.all(
		Array.from(mentionedAgentIds).map(async (agentId) => {
			const acks = await listInboxAcks(missionsDir, missionId, agentId);
			ackedMessageIdsByAgent.set(
				agentId,
				new Set(acks.map((entry) => entry.messageId)),
			);
		}),
	);

	const unackedMentions: UnackedTaskMention[] = [];
	for (const message of messages) {
		const unackedAgentIds = message.mentionsAgentIds.filter((agentId) => {
			const acked = ackedMessageIdsByAgent.get(agentId);
			return !acked?.has(message.id);
		});

		if (unackedAgentIds.length > 0) {
			unackedMentions.push({
				messageId: message.id,
				authorAgentId: message.authorAgentId,
				createdAt: message.createdAt,
				unackedAgentIds: Array.from(new Set(unackedAgentIds)),
			});
		}
	}

	return unackedMentions;
}

export async function acknowledgeAllTaskMentions(
	missionsDir: string,
	missionId: string,
	taskId: string,
): Promise<{
	ackedEntries: number;
	ackedMessages: number;
	ackedAgents: number;
}> {
	const pendingMentions = await listUnackedTaskMentions(
		missionsDir,
		missionId,
		taskId,
	);
	if (pendingMentions.length === 0) {
		return {
			ackedEntries: 0,
			ackedMessages: 0,
			ackedAgents: 0,
		};
	}

	await Promise.all(
		pendingMentions.flatMap((item) =>
			item.unackedAgentIds.map((agentId) =>
				appendInboxAck({
					missionsDir,
					missionId,
					agentId,
					messageId: item.messageId,
					taskId,
				}),
			),
		),
	);

	const ackedEntries = pendingMentions.reduce(
		(count, item) => count + item.unackedAgentIds.length,
		0,
	);
	const ackedAgents = new Set(
		pendingMentions.flatMap((item) => item.unackedAgentIds),
	).size;

	return {
		ackedEntries,
		ackedMessages: pendingMentions.length,
		ackedAgents,
	};
}
