import { isAbsolute, join } from "node:path";
import { NotFoundError } from "../errors";
import { loadMissionsIndex } from "./index-file";

export async function resolveMissionPath(
	missionsDir: string,
	missionId: string,
): Promise<string> {
	const index = await loadMissionsIndex(missionsDir);
	const entry = index.missions.find((mission) => mission.id === missionId);

	if (!entry) {
		throw new NotFoundError(`Mission not found: ${missionId}`);
	}

	if (isAbsolute(entry.path)) {
		return entry.path;
	}

	return join(missionsDir, entry.path);
}
