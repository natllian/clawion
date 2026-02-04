import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { readJson, writeJsonAtomic } from "../fs/json";
import { pathExists } from "../fs/util";
import { logEventSchema, logSchema } from "../schemas";
import { resolveMissionPath } from "./mission";

type LogInput = {
	missionsDir: string;
	missionId: string;
	agentId: string;
	level: "info" | "warn" | "error";
	type: string;
	message: string;
	taskId?: string;
	threadId?: string;
	payload?: Record<string, unknown>;
};

function nowIso(): string {
	return new Date().toISOString();
}

async function loadLog(missionPath: string, agentId: string) {
	const logPath = join(missionPath, "logs", `${agentId}.json`);
	try {
		return {
			path: logPath,
			data: await readJson(logPath, logSchema),
		};
	} catch {
		const empty = logSchema.parse({
			schemaVersion: 1,
			agentId,
			events: [],
		});
		await writeJsonAtomic(logPath, empty);
		return { path: logPath, data: empty };
	}
}

export async function addLogEvent(input: LogInput) {
	const missionPath = await resolveMissionPath(
		input.missionsDir,
		input.missionId,
	);
	const log = await loadLog(missionPath, input.agentId);
	const event = logEventSchema.parse({
		id: randomUUID(),
		timestamp: nowIso(),
		level: input.level,
		type: input.type,
		message: input.message,
		refs: {
			missionId: input.missionId,
			taskId: input.taskId,
			threadId: input.threadId,
		},
		payload: input.payload,
	});

	const nextLog = logSchema.parse({
		...log.data,
		events: [...log.data.events, event],
	});

	await writeJsonAtomic(log.path, nextLog);
	return event.id;
}

export async function getLog(
	missionsDir: string,
	missionId: string,
	agentId: string,
) {
	const missionPath = await resolveMissionPath(missionsDir, missionId);
	const logPath = join(missionPath, "logs", `${agentId}.json`);
	if (!(await pathExists(logPath))) {
		return logSchema.parse({
			schemaVersion: 1,
			agentId,
			events: [],
		});
	}
	return readJson(logPath, logSchema);
}
