import { join } from "node:path";
import { readJson } from "../fs/json";
import { workersSchema } from "../schemas";
import { resolveMissionPath } from "./mission";

type ManagerCheckInput = {
	missionsDir: string;
	missionId: string;
	workerId: string;
};

export async function assertManager(input: ManagerCheckInput): Promise<void> {
	const missionPath = await resolveMissionPath(
		input.missionsDir,
		input.missionId,
	);
	const workersPath = join(missionPath, "workers.json");
	const workersFile = await readJson(workersPath, workersSchema);
	const worker = workersFile.workers.find(
		(entry) => entry.id === input.workerId,
	);

	if (!worker) {
		throw new Error(`Worker not found: ${input.workerId}`);
	}

	if (worker.systemRole !== "manager") {
		throw new Error(
			`Manager role required. Worker ${input.workerId} is not a manager.`,
		);
	}
}
