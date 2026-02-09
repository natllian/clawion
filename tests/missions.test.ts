import { access, rm } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { readJson } from "../src/core/fs/json";
import { missionSchema, missionsIndexSchema } from "../src/core/schemas";
import {
	completeMission,
	createMission,
	deleteMission,
	listMissions,
	showMission,
	updateMissionRoadmap,
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
		expect(details.roadmap.trim()).toBe("");
	});

	it("completes mission", async () => {
		const missionsDir = await createWorkspace();
		await createMissionFixture(missionsDir, "m1");

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

	it("updates mission roadmap", async () => {
		const missionsDir = await createWorkspace();
		await createMissionFixture(missionsDir, "m1");

		await updateMissionRoadmap({
			missionsDir,
			id: "m1",
			roadmap: "# New Roadmap\n\n- Item A\n",
		});

		const details = await showMission(missionsDir, "m1");
		expect(details.roadmap).toContain("New Roadmap");
		expect(details.roadmap).toContain("Item A");
	});

	it("rejects duplicate mission creation", async () => {
		const missionsDir = await createWorkspace();
		await createMissionFixture(missionsDir, "m1");

		await expect(createMissionFixture(missionsDir, "m1")).rejects.toThrow(
			"Mission directory already exists",
		);
	});

	it("deletes mission directory and index entry", async () => {
		const missionsDir = await createWorkspace();
		await createMissionFixture(missionsDir, "m1");

		await deleteMission(missionsDir, "m1");

		await expect(showMission(missionsDir, "m1")).rejects.toThrow(
			"Mission not found: m1",
		);
		const index = await readJson(
			join(missionsDir, "index.json"),
			missionsIndexSchema,
		);
		expect(index.missions).toHaveLength(0);
	});

	it("rolls back mission directory if adding index entry fails", async () => {
		const missionsDir = await createWorkspace();
		await createMissionFixture(missionsDir, "m1");

		// Keep a duplicate id in index, but remove directory so createMission passes pre-check
		await rm(join(missionsDir, "m1"), { recursive: true, force: true });

		await expect(
			createMission({
				missionsDir,
				id: "m1",
				name: "Mission One Duplicate",
			}),
		).rejects.toThrow("Mission already exists in index: m1");

		// Rollback should remove the recreated mission directory on failure
		await expect(access(join(missionsDir, "m1"))).rejects.toThrow();
	});
});
