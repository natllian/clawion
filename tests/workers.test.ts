import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { readJson, writeJsonAtomic } from "../src/core/fs/json";
import { workersSchema } from "../src/core/schemas";
import { DEFAULT_MANAGER_ROLE_DESCRIPTION } from "../src/core/workspace/roles";
import {
	addWorker,
	listWorkers,
	readWorkingFile,
	resolveWorkingPath,
	updateWorker,
} from "../src/core/workspace/workers";
import { createMissionFixture, createWorkspace } from "./helpers";

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

	it("rejects duplicate workers", async () => {
		const missionDir = await createMissionDir();

		await addWorker(missionDir, {
			id: "worker-1",
			displayName: "Worker",
			roleDescription: "Contributor",
			systemRole: "worker",
		});

		await expect(
			addWorker(missionDir, {
				id: "worker-1",
				displayName: "Worker",
				roleDescription: "Contributor",
				systemRole: "worker",
			}),
		).rejects.toThrow("Worker already exists");
	});
});

describe("worker updates", () => {
	it("updates worker data and lists workers", async () => {
		const missionsDir = await createWorkspace();
		await createMissionFixture(missionsDir, "m1");
		const missionDir = join(missionsDir, "m1");

		await addWorker(missionDir, {
			id: "worker-1",
			displayName: "Worker",
			roleDescription: "Contributor",
			systemRole: "worker",
		});
		await addWorker(missionDir, {
			id: "worker-2",
			displayName: "Worker Two",
			roleDescription: "Contributor",
			systemRole: "worker",
		});

		await updateWorker(missionDir, "worker-1", {
			displayName: "Worker Updated",
			status: "paused",
		});
		await updateWorker(missionDir, "worker-1", {
			roleDescription: "Updated role",
		});

		const workersFile = await listWorkers(missionDir);
		expect(workersFile.workers[0].displayName).toBe("Worker Updated");
		expect(workersFile.workers[0].status).toBe("paused");
		expect(workersFile.workers[0].roleDescription).toBe("Updated role");
		expect(workersFile.workers).toHaveLength(2);

		const workingPath = resolveWorkingPath(missionDir, "worker-1");
		expect(workingPath).toContain("working/worker-1.md");
	});

	it("rejects updates for missing workers", async () => {
		const missionsDir = await createWorkspace();
		await createMissionFixture(missionsDir, "m1");
		const missionDir = join(missionsDir, "m1");

		await expect(
			updateWorker(missionDir, "missing", {
				displayName: "Nope",
			}),
		).rejects.toThrow("Worker not found");
	});

	it("reads working file content", async () => {
		const missionsDir = await createWorkspace();
		await createMissionFixture(missionsDir, "m1");
		const missionDir = join(missionsDir, "m1");

		const workingPath = join(missionDir, "working", "worker-1.md");
		await mkdir(join(missionDir, "working"), { recursive: true });
		await writeFile(
			workingPath,
			"# Working Memory\n\nTask progress: 50%",
			"utf8",
		);

		const content = await readWorkingFile(missionDir, "worker-1");
		expect(content).toContain("Working Memory");
		expect(content).toContain("Task progress: 50%");
	});

	it("returns empty string for non-existent working file", async () => {
		const missionsDir = await createWorkspace();
		await createMissionFixture(missionsDir, "m1");
		const missionDir = join(missionsDir, "m1");

		const content = await readWorkingFile(missionDir, "ghost-worker");
		expect(content).toBe("");
	});
});
