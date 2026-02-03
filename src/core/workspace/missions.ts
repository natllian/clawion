import { cp, readFile } from "node:fs/promises";
import { join } from "node:path";
import { readJson, writeJsonAtomic } from "../fs/json";
import { pathExists } from "../fs/util";
import { missionSchema, tasksSchema, workersSchema } from "../schemas";
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
	description: string;
};

type MissionUpdateInput = {
	missionsDir: string;
	id: string;
	description: string;
};

function nowIso(): string {
	return new Date().toISOString();
}

export async function createMission(input: MissionCreateInput) {
	const missionDir = join(input.missionsDir, input.id);
	const templateDir = join(input.missionsDir, "_template");

	if (await pathExists(missionDir)) {
		throw new Error(`Mission directory already exists: ${input.id}`);
	}

	await cp(templateDir, missionDir, { recursive: true });

	const now = nowIso();
	const mission = missionSchema.parse({
		schemaVersion: 1,
		id: input.id,
		name: input.name,
		description: input.description,
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

	const workers = await readJson(
		join(missionDir, "workers.json"),
		workersSchema,
	);
	await writeJsonAtomic(join(missionDir, "workers.json"), workers);

	await addMissionIndexEntry(input.missionsDir, {
		id: input.id,
		name: input.name,
		description: input.description,
		path: input.id,
		status: "active",
		createdAt: now,
		updatedAt: now,
	});
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

export async function updateMission(input: MissionUpdateInput) {
	const missionPath = await resolveMissionPath(input.missionsDir, input.id);
	const mission = await readJson(
		join(missionPath, "mission.json"),
		missionSchema,
	);
	const nextMission = missionSchema.parse({
		...mission,
		description: input.description,
		updatedAt: nowIso(),
	});

	await writeJsonAtomic(join(missionPath, "mission.json"), nextMission);
	await updateMissionIndexEntry(input.missionsDir, input.id, {
		description: input.description,
		updatedAt: nextMission.updatedAt,
	});
}

export async function completeMission(missionsDir: string, missionId: string) {
	const missionPath = await resolveMissionPath(missionsDir, missionId);
	const mission = await readJson(
		join(missionPath, "mission.json"),
		missionSchema,
	);
	const updatedAt = nowIso();
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
