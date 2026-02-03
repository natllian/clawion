import { mkdir, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { writeJsonAtomic } from "../src/core/fs/json";
import { assertManager } from "../src/core/workspace/permissions";

function nowIso(): string {
	return new Date().toISOString();
}

async function setupMission(
	missionsDir: string,
	missionId: string,
	workers: Array<{
		id: string;
		displayName: string;
		roleDescription: string;
		systemRole: "manager" | "worker";
		status: "active" | "paused";
	}>,
): Promise<void> {
	const missionDir = join(missionsDir, missionId);
	await mkdir(missionDir, { recursive: true });

	await writeJsonAtomic(join(missionDir, "workers.json"), {
		schemaVersion: 1,
		workers,
	});

	await writeJsonAtomic(join(missionsDir, "index.json"), {
		schemaVersion: 1,
		updatedAt: nowIso(),
		missions: [
			{
				id: missionId,
				name: "Test Mission",
				description: "Test",
				path: missionId,
				status: "active",
				createdAt: nowIso(),
				updatedAt: nowIso(),
			},
		],
	});
}

describe("assertManager", () => {
	it("allows a manager worker", async () => {
		const missionsDir = await mkdtemp(join(tmpdir(), "clawion-perm-"));
		await setupMission(missionsDir, "m1", [
			{
				id: "manager-1",
				displayName: "Manager",
				roleDescription: "Lead",
				systemRole: "manager",
				status: "active",
			},
		]);

		await expect(
			assertManager({
				missionsDir,
				missionId: "m1",
				workerId: "manager-1",
			}),
		).resolves.toBeUndefined();
	});

	it("rejects a non-manager worker", async () => {
		const missionsDir = await mkdtemp(join(tmpdir(), "clawion-perm-"));
		await setupMission(missionsDir, "m1", [
			{
				id: "manager-1",
				displayName: "Manager",
				roleDescription: "Lead",
				systemRole: "manager",
				status: "active",
			},
			{
				id: "worker-1",
				displayName: "Worker",
				roleDescription: "Contributor",
				systemRole: "worker",
				status: "active",
			},
		]);

		await expect(
			assertManager({
				missionsDir,
				missionId: "m1",
				workerId: "worker-1",
			}),
		).rejects.toThrow("Manager role required");
	});
});
