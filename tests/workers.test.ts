import { mkdir, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { readJson, writeJsonAtomic } from "../src/core/fs/json";
import { workersSchema } from "../src/core/schemas";
import { DEFAULT_MANAGER_ROLE_DESCRIPTION } from "../src/core/workspace/roles";
import { addWorker } from "../src/core/workspace/workers";

async function createMissionDir(): Promise<string> {
	const root = await mkdtemp(join(tmpdir(), "clawion-workers-"));
	const missionDir = join(root, "mission-a");
	await mkdir(missionDir, { recursive: true });

	await writeJsonAtomic(join(missionDir, "workers.json"), {
		schemaVersion: 1,
		workers: [],
	});

	return missionDir;
}

describe("addWorker", () => {
	it("adds a manager and fills default role description", async () => {
		const missionDir = await createMissionDir();

		await addWorker(missionDir, {
			id: "manager-1",
			displayName: "Manager",
			systemRole: "manager",
		});

		const workersFile = await readJson(
			join(missionDir, "workers.json"),
			workersSchema,
		);

		expect(workersFile.workers).toHaveLength(1);
		expect(workersFile.workers[0].roleDescription).toBe(
			DEFAULT_MANAGER_ROLE_DESCRIPTION,
		);
	});

	it("requires roleDescription for non-manager workers", async () => {
		const missionDir = await createMissionDir();

		await expect(
			addWorker(missionDir, {
				id: "worker-1",
				displayName: "Worker",
				systemRole: "worker",
			}),
		).rejects.toThrow("roleDescription is required");
	});
});
