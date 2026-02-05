import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { appendJsonLine, readJsonLines } from "../fs/jsonl";
import { pathExists } from "../fs/util";
import {
	type ThreadMessageEvent,
	type ThreadSummary,
	threadMessageEventSchema,
	threadSummarySchema,
} from "../schemas";
import { resolveMissionPath } from "./mission";

type ThreadMessageInput = {
	missionsDir: string;
	missionId: string;
	taskId: string;
	authorAgentId: string;
	mentionsAgentIds: string[];
	content: string;
};

function nowIso(): string {
	return new Date().toISOString();
}

function resolveThreadPath(missionPath: string, taskId: string): string {
	return join(missionPath, "threads", `${taskId}.jsonl`);
}

export async function addThreadMessage(input: ThreadMessageInput) {
	const missionPath = await resolveMissionPath(
		input.missionsDir,
		input.missionId,
	);
	const threadPath = resolveThreadPath(missionPath, input.taskId);
	const message = threadMessageEventSchema.parse({
		type: "message",
		id: randomUUID(),
		createdAt: nowIso(),
		authorAgentId: input.authorAgentId,
		mentionsAgentIds: input.mentionsAgentIds,
		content: input.content,
	});

	await appendJsonLine(threadPath, message);
	return message.id;
}

export async function listThreadMessages(
	missionsDir: string,
	missionId: string,
	taskId: string,
): Promise<ThreadMessageEvent[]> {
	const missionPath = await resolveMissionPath(missionsDir, missionId);
	const threadPath = resolveThreadPath(missionPath, taskId);
	return readJsonLines(threadPath, threadMessageEventSchema);
}

export async function getThread(
	missionsDir: string,
	missionId: string,
	taskId: string,
) {
	const messages = await listThreadMessages(missionsDir, missionId, taskId);
	return {
		taskId,
		messages,
	};
}

export async function listThreads(
	missionsDir: string,
	missionId: string,
): Promise<ThreadSummary[]> {
	const missionPath = await resolveMissionPath(missionsDir, missionId);
	const threadsDir = join(missionPath, "threads");

	if (!(await pathExists(threadsDir))) {
		return [];
	}

	const { readdir } = await import("node:fs/promises");
	const files = await readdir(threadsDir);
	const threadFiles = files.filter((file) => file.endsWith(".jsonl"));

	const summaries = await Promise.all(
		threadFiles.map(async (file) => {
			const taskId = file.replace(/\.jsonl$/, "");
			const messages = await readJsonLines(
				join(threadsDir, file),
				threadMessageEventSchema,
			);
			const lastMessage = messages[messages.length - 1];

			return threadSummarySchema.parse({
				taskId,
				messageCount: messages.length,
				lastMessageAt: lastMessage?.createdAt,
				lastAuthorAgentId: lastMessage?.authorAgentId,
				lastMentionsAgentIds: lastMessage?.mentionsAgentIds ?? [],
			});
		}),
	);

	return summaries;
}
