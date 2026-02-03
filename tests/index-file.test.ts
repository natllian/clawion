import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { readJson } from "../src/core/fs/json";
import { missionsIndexSchema } from "../src/core/schemas";
import {
	addMissionIndexEntry,
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
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		});
		await addMissionIndexEntry(missionsDir, {
			id: "m2",
			name: "Mission Two",
			description: "Desc",
			path: "m2",
			status: "active",
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
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
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		});

		await expect(
			addMissionIndexEntry(missionsDir, {
				id: "m1",
				name: "Mission One",
				description: "Desc",
				path: "m1",
				status: "active",
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			}),
		).rejects.toThrow("Mission already exists");

		await expect(
			updateMissionIndexEntry(missionsDir, "missing", {
				description: "Updated",
			}),
		).rejects.toThrow("Mission not found");
	});
});
