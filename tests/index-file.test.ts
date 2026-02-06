import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { readJson } from "../src/core/fs/json";
import { missionsIndexSchema } from "../src/core/schemas";
import { nowLocal } from "../src/core/time";
import {
	addMissionIndexEntry,
	loadMissionsIndex,
	updateMissionIndexEntry,
} from "../src/core/workspace/index-file";
import { createWorkspace } from "./helpers";

describe("missions index", () => {
	it("adds and updates index entries", async () => {
		const missionsDir = await createWorkspace();

		await addMissionIndexEntry(missionsDir, {
			id: "m1",
			name: "Mission One",
			description: "Desc",
			path: "m1",
			status: "active",
			createdAt: nowLocal(),
			updatedAt: nowLocal(),
		});
		await addMissionIndexEntry(missionsDir, {
			id: "m2",
			name: "Mission Two",
			description: "Desc",
			path: "m2",
			status: "active",
			createdAt: nowLocal(),
			updatedAt: nowLocal(),
		});

		await updateMissionIndexEntry(missionsDir, "m1", {
			description: "Updated",
		});

		const index = await readJson(
			join(missionsDir, "index.json"),
			missionsIndexSchema,
		);
		expect(index.missions[0].description).toBe("Updated");
		expect(index.missions).toHaveLength(2);
	});

	it("rejects duplicates and missing missions", async () => {
		const missionsDir = await createWorkspace();

		await addMissionIndexEntry(missionsDir, {
			id: "m1",
			name: "Mission One",
			description: "Desc",
			path: "m1",
			status: "active",
			createdAt: nowLocal(),
			updatedAt: nowLocal(),
		});

		await expect(
			addMissionIndexEntry(missionsDir, {
				id: "m1",
				name: "Mission One",
				description: "Desc",
				path: "m1",
				status: "active",
				createdAt: nowLocal(),
				updatedAt: nowLocal(),
			}),
		).rejects.toThrow("Mission already exists");

		await expect(
			updateMissionIndexEntry(missionsDir, "missing", {
				description: "Updated",
			}),
		).rejects.toThrow("Mission not found");
	});

	it("throws helpful error when index.json does not exist", async () => {
		// Create a temporary directory without the index.json file
		const tempDir = await mkdtemp("/tmp/clawion-test-");
		try {
			await expect(loadMissionsIndex(tempDir)).rejects.toThrow(
				"Missions index not found",
			);
		} finally {
			await rm(tempDir, { recursive: true, force: true });
		}
	});
});
