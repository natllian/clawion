import { join } from "node:path";
import { readJson, writeJsonAtomic } from "../fs/json";
import { missionsIndexSchema } from "../schemas";

export type MissionIndexEntryInput = {
	id: string;
	name: string;
	description: string;
	path: string;
	status: "active" | "paused" | "archived" | "completed";
	createdAt: string;
	updatedAt: string;
};

export async function loadMissionsIndex(missionsDir: string) {
	const indexPath = join(missionsDir, "index.json");
	try {
		return await readJson(indexPath, missionsIndexSchema);
	} catch (error) {
		if (error instanceof Error && "code" in error && error.code === "ENOENT") {
			throw new Error(
				`Missions index not found: ${indexPath}. Is this a valid workspace?`,
			);
		}
		throw new Error(
			`Failed to read missions index: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

export async function saveMissionsIndex(
	missionsDir: string,
	index: ReturnType<typeof missionsIndexSchema.parse>,
) {
	const indexPath = join(missionsDir, "index.json");
	await writeJsonAtomic(indexPath, index);
}

export async function addMissionIndexEntry(
	missionsDir: string,
	entry: MissionIndexEntryInput,
) {
	const index = await loadMissionsIndex(missionsDir);
	if (index.missions.some((mission) => mission.id === entry.id)) {
		throw new Error(`Mission already exists in index: ${entry.id}`);
	}

	const nextIndex = missionsIndexSchema.parse({
		...index,
		updatedAt: new Date().toISOString(),
		missions: [...index.missions, entry],
	});

	await saveMissionsIndex(missionsDir, nextIndex);
}

export async function updateMissionIndexEntry(
	missionsDir: string,
	missionId: string,
	updates: Partial<Omit<MissionIndexEntryInput, "id" | "path" | "createdAt">>,
) {
	const index = await loadMissionsIndex(missionsDir);
	const mission = index.missions.find((entry) => entry.id === missionId);
	if (!mission) {
		throw new Error(`Mission not found in index: ${missionId}`);
	}

	const nextMission = {
		...mission,
		...updates,
	};

	const nextIndex = missionsIndexSchema.parse({
		...index,
		updatedAt: new Date().toISOString(),
		missions: index.missions.map((entry) =>
			entry.id === missionId ? nextMission : entry,
		),
	});

	await saveMissionsIndex(missionsDir, nextIndex);
}
