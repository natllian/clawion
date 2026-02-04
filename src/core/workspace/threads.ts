import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { readJson, writeJsonAtomic } from "../fs/json";
import { pathExists } from "../fs/util";
import { threadMessageSchema, threadSchema } from "../schemas";
import { addLogEvent } from "./logs";
import { resolveMissionPath } from "./mission";

type ThreadMessageInput = {
	missionsDir: string;
	missionId: string;
	taskId: string;
	title: string;
	authorAgentId: string;
	mentionsAgentId: string;
	content: string;
};

function nowIso(): string {
	return new Date().toISOString();
}

async function loadThread(missionPath: string, taskId: string) {
	const threadPath = join(missionPath, "threads", `${taskId}.json`);
	try {
		return {
			path: threadPath,
			data: await readJson(threadPath, threadSchema),
		};
	} catch {
		const empty = threadSchema.parse({
			schemaVersion: 1,
			taskId,
			title: "New Thread",
			creatorAgentId: "unknown",
			status: "open",
			messages: [],
		});
		await writeJsonAtomic(threadPath, empty);
		return { path: threadPath, data: empty };
	}
}

export async function createThread(input: ThreadMessageInput) {
	const missionPath = await resolveMissionPath(
		input.missionsDir,
		input.missionId,
	);
	const threadPath = join(missionPath, "threads", `${input.taskId}.json`);

	if (await pathExists(threadPath)) {
		throw new Error(`Thread already exists for task: ${input.taskId}`);
	}

	const thread = threadSchema.parse({
		schemaVersion: 1,
		taskId: input.taskId,
		title: input.title,
		creatorAgentId: input.authorAgentId,
		status: "open",
		messages: [],
	});

	await writeJsonAtomic(threadPath, thread);
	return thread;
}

export async function addThreadMessage(input: ThreadMessageInput) {
	const missionPath = await resolveMissionPath(
		input.missionsDir,
		input.missionId,
	);
	const thread = await loadThread(missionPath, input.taskId);

	const message = threadMessageSchema.parse({
		id: randomUUID(),
		createdAt: nowIso(),
		authorAgentId: input.authorAgentId,
		mentionsAgentId: input.mentionsAgentId,
		content: input.content,
		resolved: false,
	});

	const nextThread = threadSchema.parse({
		...thread.data,
		title: thread.data.title || input.title,
		creatorAgentId: thread.data.creatorAgentId || input.authorAgentId,
		messages: [...thread.data.messages, message],
	});

	await writeJsonAtomic(thread.path, nextThread);
	return message.id;
}

export async function resolveThreadMessage(
	missionsDir: string,
	missionId: string,
	taskId: string,
	messageId: string,
	resolvedByAgentId: string,
) {
	const missionPath = await resolveMissionPath(missionsDir, missionId);
	const thread = await loadThread(missionPath, taskId);
	const message = thread.data.messages.find((entry) => entry.id === messageId);

	if (!message) {
		throw new Error(`Message not found: ${messageId}`);
	}

	const updatedMessage = threadMessageSchema.parse({
		...message,
		resolved: true,
		resolvedAt: nowIso(),
		resolvedByAgentId,
		reopenedAt: undefined,
		reopenedByAgentId: undefined,
	});

	// Update thread status based on unresolved messages
	const hasUnresolved = thread.data.messages.some(
		(m) => m.id !== messageId && !m.resolved,
	);

	const nextThread = threadSchema.parse({
		...thread.data,
		status: hasUnresolved ? "open" : "resolved",
		messages: thread.data.messages.map((entry) =>
			entry.id === messageId ? updatedMessage : entry,
		),
	});

	await writeJsonAtomic(thread.path, nextThread);
}

export async function unresolveThreadMessage(
	missionsDir: string,
	missionId: string,
	taskId: string,
	messageId: string,
	reopenedByAgentId: string,
) {
	const missionPath = await resolveMissionPath(missionsDir, missionId);
	const thread = await loadThread(missionPath, taskId);
	const message = thread.data.messages.find((entry) => entry.id === messageId);

	if (!message) {
		throw new Error(`Message not found: ${messageId}`);
	}

	const reopenedAt = nowIso();
	const updatedMessage = threadMessageSchema.parse({
		...message,
		resolved: false,
		resolvedAt: undefined,
		resolvedByAgentId: undefined,
		reopenedAt,
		reopenedByAgentId,
	});

	const nextThread = threadSchema.parse({
		...thread.data,
		status: "open",
		messages: thread.data.messages.map((entry) =>
			entry.id === messageId ? updatedMessage : entry,
		),
	});

	await writeJsonAtomic(thread.path, nextThread);

	await addLogEvent({
		missionsDir,
		missionId,
		agentId: reopenedByAgentId,
		level: "info",
		type: "thread:unresolve",
		message: `Reopened thread message ${messageId} in task ${taskId}.`,
		taskId,
		threadId: messageId,
		payload: {
			taskId,
			messageId,
			reopenedAt,
		},
	});
}

export async function getThread(
	missionsDir: string,
	missionId: string,
	taskId: string,
) {
	const missionPath = await resolveMissionPath(missionsDir, missionId);
	const threadPath = join(missionPath, "threads", `${taskId}.json`);
	if (!(await pathExists(threadPath))) {
		return threadSchema.parse({
			schemaVersion: 1,
			taskId,
			title: "New Thread",
			creatorAgentId: "unknown",
			status: "open",
			messages: [],
		});
	}
	return readJson(threadPath, threadSchema);
}

export async function listThreads(missionsDir: string, missionId: string) {
	const missionPath = await resolveMissionPath(missionsDir, missionId);
	const threadsDir = join(missionPath, "threads");

	if (!(await pathExists(threadsDir))) {
		return [];
	}

	const { readdir } = await import("node:fs/promises");
	const files = await readdir(threadsDir);
	const threadFiles = files.filter((f) => f.endsWith(".json"));

	const threads = await Promise.all(
		threadFiles.map(async (file) => {
			const _taskId = file.replace(/\.json$/, "");
			return readJson(join(threadsDir, file), threadSchema);
		}),
	);

	return threads;
}
