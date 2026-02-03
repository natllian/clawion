import { join } from "node:path";
import { readJson, writeJsonAtomic } from "../fs/json";
import { workerSchema, workersSchema } from "../schemas";
import { DEFAULT_MANAGER_ROLE_DESCRIPTION } from "./roles";

export type WorkerInput = {
	id: string;
	displayName: string;
	roleDescription?: string;
	systemRole: "manager" | "worker";
	status?: "active" | "paused";
};

export async function addWorker(
	missionDir: string,
	worker: WorkerInput,
): Promise<void> {
	const workersPath = join(missionDir, "workers.json");
	const workersFile = await readJson(workersPath, workersSchema);

	if (workersFile.workers.some((entry) => entry.id === worker.id)) {
		throw new Error(`Worker already exists: ${worker.id}`);
	}

	const normalizedRoleDescription = normalizeRoleDescription(worker);
	const normalizedStatus = worker.status ?? "active";

	const nextWorker = workerSchema.parse({
		id: worker.id,
		displayName: worker.displayName,
		roleDescription: normalizedRoleDescription,
		systemRole: worker.systemRole,
		status: normalizedStatus,
	});

	const nextFile = workersSchema.parse({
		...workersFile,
		workers: [...workersFile.workers, nextWorker],
	});

	await writeJsonAtomic(workersPath, nextFile);
}

function normalizeRoleDescription(worker: WorkerInput): string {
	const trimmed = worker.roleDescription?.trim();
	if (trimmed && trimmed.length > 0) {
		return trimmed;
	}

	if (worker.systemRole === "manager") {
		return DEFAULT_MANAGER_ROLE_DESCRIPTION;
	}

	throw new Error("roleDescription is required for non-manager workers.");
}

export async function updateWorker(
	missionDir: string,
	workerId: string,
	updates: Partial<Omit<WorkerInput, "id" | "systemRole">>,
): Promise<void> {
	const workersPath = join(missionDir, "workers.json");
	const workersFile = await readJson(workersPath, workersSchema);
	const worker = workersFile.workers.find((entry) => entry.id === workerId);

	if (!worker) {
		throw new Error(`Worker not found: ${workerId}`);
	}

	const nextWorker = workerSchema.parse({
		...worker,
		displayName: updates.displayName ?? worker.displayName,
		roleDescription: updates.roleDescription ?? worker.roleDescription,
		status: updates.status ?? worker.status,
	});

	const nextFile = workersSchema.parse({
		...workersFile,
		workers: workersFile.workers.map((entry) =>
			entry.id === workerId ? nextWorker : entry,
		),
	});

	await writeJsonAtomic(workersPath, nextFile);
}

export async function listWorkers(missionDir: string) {
	return readJson(join(missionDir, "workers.json"), workersSchema);
}

export function resolveWorkingPath(
	missionDir: string,
	workerId: string,
): string {
	return join(missionDir, "working", `${workerId}.md`);
}
