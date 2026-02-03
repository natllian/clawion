import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { readJson } from "../src/core/fs/json";
import { missionSchema, missionsIndexSchema } from "../src/core/schemas";
import {
	completeMission,
	listMissions,
	showMission,
	updateMission,
} from "../src/core/workspace/missions";
import { createMissionFixture, createWorkspace } from "./helpers";

describe("missions", () => {
	it("creates a mission and updates index", async () => {
		const missionsDir = await createWorkspace();
		await createMissionFixture(missionsDir, "m1");

		const index = await readJson(
			join(missionsDir, "index.json"),
			missionsIndexSchema,
		);
		expect(index.missions).toHaveLength(1);
		expect(index.missions[0].id).toBe("m1");

		const mission = await readJson(
			join(missionsDir, "m1", "mission.json"),
			missionSchema,
		);
		expect(mission.name).toBe("Mission One");
	});

	it("lists and shows missions", async () => {
		const missionsDir = await createWorkspace();
		await createMissionFixture(missionsDir, "m1");

		const missions = await listMissions(missionsDir);
		expect(missions).toHaveLength(1);

		const details = await showMission(missionsDir, "m1");
		expect(details.mission.id).toBe("m1");
		expect(details.roadmap).toContain("Mission Roadmap");
	});

	it("updates mission description and completes mission", async () => {
		const missionsDir = await createWorkspace();
		await createMissionFixture(missionsDir, "m1");

		await updateMission({
			missionsDir,
			id: "m1",
			description: "Updated description",
		});

		const updated = await readJson(
			join(missionsDir, "m1", "mission.json"),
			missionSchema,
		);
		expect(updated.description).toBe("Updated description");

		const indexAfterUpdate = await readJson(
			join(missionsDir, "index.json"),
			missionsIndexSchema,
		);
		expect(indexAfterUpdate.missions[0].description).toBe(
			"Updated description",
		);

		await completeMission(missionsDir, "m1");
		const completed = await readJson(
			join(missionsDir, "m1", "mission.json"),
			missionSchema,
		);
		expect(completed.status).toBe("completed");

		const indexAfterComplete = await readJson(
			join(missionsDir, "index.json"),
			missionsIndexSchema,
		);
		expect(indexAfterComplete.missions[0].status).toBe("completed");
	});
});
