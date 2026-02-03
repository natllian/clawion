import { join } from "node:path";
import { readJson, writeJsonAtomic } from "../fs/json";
import { taskItemSchema, tasksSchema } from "../schemas";
import { resolveMissionPath } from "./mission";

type TaskCreateInput = {
	missionsDir: string;
	missionId: string;
	id: string;
	title: string;
	description: string;
	columnId?: string;
};

type TaskUpdateInput = {
	missionsDir: string;
	missionId: string;
	id: string;
	columnId?: string;
	statusNotes?: string;
};

function nowIso(): string {
	return new Date().toISOString();
}

export async function listTasks(missionsDir: string, missionId: string) {
	const missionPath = await resolveMissionPath(missionsDir, missionId);
	return readJson(join(missionPath, "tasks.json"), tasksSchema);
}

export async function createTask(input: TaskCreateInput) {
	const missionPath = await resolveMissionPath(
		input.missionsDir,
		input.missionId,
	);
	const tasksFile = await readJson(
		join(missionPath, "tasks.json"),
		tasksSchema,
	);
	if (tasksFile.tasks.some((task) => task.id === input.id)) {
		throw new Error(`Task already exists: ${input.id}`);
	}

	const defaultColumn = tasksFile.columns[0]?.id;
	const columnId = input.columnId ?? defaultColumn;
	if (!columnId) {
		throw new Error("No columns available to assign task.");
	}

	const now = nowIso();
	const task = taskItemSchema.parse({
		id: input.id,
		title: input.title,
		description: input.description,
		columnId,
		statusNotes: "",
		createdAt: now,
		updatedAt: now,
	});

	const nextFile = tasksSchema.parse({
		...tasksFile,
		tasks: [...tasksFile.tasks, task],
	});

	await writeJsonAtomic(join(missionPath, "tasks.json"), nextFile);
}

export async function updateTask(input: TaskUpdateInput) {
	const missionPath = await resolveMissionPath(
		input.missionsDir,
		input.missionId,
	);
	const tasksFile = await readJson(
		join(missionPath, "tasks.json"),
		tasksSchema,
	);
	const task = tasksFile.tasks.find((entry) => entry.id === input.id);
	if (!task) {
		throw new Error(`Task not found: ${input.id}`);
	}

	const nextTask = taskItemSchema.parse({
		...task,
		columnId: input.columnId ?? task.columnId,
		statusNotes: input.statusNotes ?? task.statusNotes,
		updatedAt: nowIso(),
	});

	const nextFile = tasksSchema.parse({
		...tasksFile,
		tasks: tasksFile.tasks.map((entry) =>
			entry.id === input.id ? nextTask : entry,
		),
	});

	await writeJsonAtomic(join(missionPath, "tasks.json"), nextFile);
}

export async function assignTask(
	missionsDir: string,
	missionId: string,
	taskId: string,
	assigneeId: string,
) {
	const missionPath = await resolveMissionPath(missionsDir, missionId);
	const tasksFile = await readJson(
		join(missionPath, "tasks.json"),
		tasksSchema,
	);
	const task = tasksFile.tasks.find((entry) => entry.id === taskId);
	if (!task) {
		throw new Error(`Task not found: ${taskId}`);
	}

	const nextTask = taskItemSchema.parse({
		...task,
		assigneeId,
		updatedAt: nowIso(),
	});

	const nextFile = tasksSchema.parse({
		...tasksFile,
		tasks: tasksFile.tasks.map((entry) =>
			entry.id === taskId ? nextTask : entry,
		),
	});

	await writeJsonAtomic(join(missionPath, "tasks.json"), nextFile);
}
