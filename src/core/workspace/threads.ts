import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { readJson, writeJsonAtomic } from "../fs/json";
import { pathExists } from "../fs/util";
import { threadMessageSchema, threadSchema } from "../schemas";
import { resolveMissionPath } from "./mission";

type ThreadMessageInput = {
	missionsDir: string;
	missionId: string;
	taskId: string;
	authorId: string;
	mentions: string;
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
			messages: [],
		});
		await writeJsonAtomic(threadPath, empty);
		return { path: threadPath, data: empty };
	}
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
		authorId: input.authorId,
		mentions: input.mentions,
		content: input.content,
		resolved: false,
	});

	const nextThread = threadSchema.parse({
		...thread.data,
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
	resolvedBy: string,
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
		resolvedBy,
	});

	const nextThread = threadSchema.parse({
		...thread.data,
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
) {
	const missionPath = await resolveMissionPath(missionsDir, missionId);
	const thread = await loadThread(missionPath, taskId);
	const message = thread.data.messages.find((entry) => entry.id === messageId);

	if (!message) {
		throw new Error(`Message not found: ${messageId}`);
	}

	const updatedMessage = threadMessageSchema.parse({
		...message,
		resolved: false,
		resolvedAt: undefined,
		resolvedBy: undefined,
	});

	const nextThread = threadSchema.parse({
		...thread.data,
		messages: thread.data.messages.map((entry) =>
			entry.id === messageId ? updatedMessage : entry,
		),
	});

	await writeJsonAtomic(thread.path, nextThread);
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
			messages: [],
		});
	}
	return readJson(threadPath, threadSchema);
}
