import { cp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { readJson, writeJsonAtomic } from "../fs/json";
import { writeMarkdownAtomic } from "../fs/markdown";
import { pathExists } from "../fs/util";
import { missionSchema, tasksSchema } from "../schemas";
import { nowLocal } from "../time";
import {
	addMissionIndexEntry,
	loadMissionsIndex,
	updateMissionIndexEntry,
} from "./index-file";
import { resolveMissionPath } from "./mission";

type MissionCreateInput = {
	missionsDir: string;
	id: string;
	name: string;
};

type MissionRoadmapUpdateInput = {
	missionsDir: string;
	id: string;
	roadmap: string;
};

export async function createMission(input: MissionCreateInput) {
	const missionDir = join(input.missionsDir, input.id);
	const templateDir = join(input.missionsDir, "_template");

	if (await pathExists(missionDir)) {
		throw new Error(`Mission directory already exists: ${input.id}`);
	}

	await cp(templateDir, missionDir, { recursive: true });

	const now = nowLocal();
	const mission = missionSchema.parse({
		schemaVersion: 1,
		id: input.id,
		name: input.name,
		status: "active",
		createdAt: now,
		updatedAt: now,
	});

	await writeJsonAtomic(join(missionDir, "mission.json"), mission);

	const tasks = await readJson(join(missionDir, "tasks.json"), tasksSchema);
	await writeJsonAtomic(
		join(missionDir, "tasks.json"),
		tasksSchema.parse({
			...tasks,
			description: `Tasks for ${input.name}.`,
		}),
	);

	try {
		await addMissionIndexEntry(input.missionsDir, {
			id: input.id,
			name: input.name,
			path: input.id,
			status: "active",
			createdAt: now,
			updatedAt: now,
		});
	} catch (error) {
		// Rollback: remove the orphaned mission directory
		await rm(missionDir, { recursive: true, force: true });
		throw error;
	}
}

export async function listMissions(missionsDir: string) {
	const index = await loadMissionsIndex(missionsDir);
	return index.missions;
}

export async function showMission(missionsDir: string, missionId: string) {
	const missionPath = await resolveMissionPath(missionsDir, missionId);
	const mission = await readJson(
		join(missionPath, "mission.json"),
		missionSchema,
	);
	const roadmap = await readFile(join(missionPath, "ROADMAP.md"), "utf8");
	return { mission, roadmap };
}

export async function updateMissionRoadmap(input: MissionRoadmapUpdateInput) {
	const missionPath = await resolveMissionPath(input.missionsDir, input.id);
	const mission = await readJson(
		join(missionPath, "mission.json"),
		missionSchema,
	);
	const updatedAt = nowLocal();

	await writeMarkdownAtomic(join(missionPath, "ROADMAP.md"), input.roadmap);

	const nextMission = missionSchema.parse({
		...mission,
		updatedAt,
	});

	await writeJsonAtomic(join(missionPath, "mission.json"), nextMission);
	await updateMissionIndexEntry(input.missionsDir, input.id, {
		updatedAt,
	});
}

export async function completeMission(missionsDir: string, missionId: string) {
	const missionPath = await resolveMissionPath(missionsDir, missionId);
	const mission = await readJson(
		join(missionPath, "mission.json"),
		missionSchema,
	);
	const updatedAt = nowLocal();
	const nextMission = missionSchema.parse({
		...mission,
		status: "completed",
		updatedAt,
	});

	await writeJsonAtomic(join(missionPath, "mission.json"), nextMission);
	await updateMissionIndexEntry(missionsDir, missionId, {
		status: "completed",
		updatedAt,
	});
}
