import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { writeJsonAtomic } from "../src/core/fs/json";
import { nowLocal } from "../src/core/time";
import { resolveMissionPath } from "../src/core/workspace/mission";
import { createWorkspace } from "./helpers";

describe("resolveMissionPath", () => {
	it("resolves relative mission paths", async () => {
		const missionsDir = await createWorkspace();
		await writeJsonAtomic(join(missionsDir, "index.json"), {
			schemaVersion: 1,
			updatedAt: nowLocal(),
			missions: [
				{
					id: "m1",
					name: "Mission One",
					description: "Desc",
					path: "m1",
					status: "active",
					createdAt: nowLocal(),
					updatedAt: nowLocal(),
				},
			],
		});

		const resolved = await resolveMissionPath(missionsDir, "m1");
		expect(resolved).toBe(join(missionsDir, "m1"));
	});

	it("returns absolute paths directly", async () => {
		const missionsDir = await createWorkspace();
		const absolutePath = join(missionsDir, "absolute-m1");
		await writeJsonAtomic(join(missionsDir, "index.json"), {
			schemaVersion: 1,
			updatedAt: nowLocal(),
			missions: [
				{
					id: "m1",
					name: "Mission One",
					description: "Desc",
					path: absolutePath,
					status: "active",
					createdAt: nowLocal(),
					updatedAt: nowLocal(),
				},
			],
		});

		const resolved = await resolveMissionPath(missionsDir, "m1");
		expect(resolved).toBe(absolutePath);
	});

	it("throws when mission is missing", async () => {
		const missionsDir = await createWorkspace();
		await expect(resolveMissionPath(missionsDir, "missing")).rejects.toThrow(
			"Mission not found",
		);
	});
});
