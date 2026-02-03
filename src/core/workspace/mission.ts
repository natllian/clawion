import { isAbsolute, join } from "node:path";
import { readJson } from "../fs/json";
import { missionsIndexSchema } from "../schemas";

export async function resolveMissionPath(
	missionsDir: string,
	missionId: string,
): Promise<string> {
	const indexPath = join(missionsDir, "index.json");
	const index = await readJson(indexPath, missionsIndexSchema);
	const entry = index.missions.find((mission) => mission.id === missionId);

	if (!entry) {
		throw new Error(`Mission not found: ${missionId}`);
	}

	if (isAbsolute(entry.path)) {
		return entry.path;
	}

	return join(missionsDir, entry.path);
}
