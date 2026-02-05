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
	agents: Array<{
		id: string;
		displayName: string;
		roleDescription: string;
		systemRole: "manager" | "worker";
	}>,
): Promise<void> {
	const missionDir = join(missionsDir, missionId);
	await mkdir(missionDir, { recursive: true });

	await writeJsonAtomic(join(missionDir, "agents.json"), {
		schemaVersion: 1,
		agents,
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
	it("allows a manager agent", async () => {
		const missionsDir = await mkdtemp(join(tmpdir(), "clawion-perm-"));
		await setupMission(missionsDir, "m1", [
			{
				id: "manager-1",
				displayName: "Manager",
				roleDescription: "Lead",
				systemRole: "manager",
			},
		]);

		await expect(
			assertManager({
				missionsDir,
				missionId: "m1",
				agentId: "manager-1",
			}),
		).resolves.toBeUndefined();
	});

	it("rejects a non-manager agent", async () => {
		const missionsDir = await mkdtemp(join(tmpdir(), "clawion-perm-"));
		await setupMission(missionsDir, "m1", [
			{
				id: "manager-1",
				displayName: "Manager",
				roleDescription: "Lead",
				systemRole: "manager",
			},
			{
				id: "agent-1",
				displayName: "Agent",
				roleDescription: "Contributor",
				systemRole: "worker",
			},
		]);

		await expect(
			assertManager({
				missionsDir,
				missionId: "m1",
				agentId: "agent-1",
			}),
		).rejects.toThrow("Manager role required");
	});

	it("rejects unknown agents", async () => {
		const missionsDir = await mkdtemp(join(tmpdir(), "clawion-perm-"));
		await setupMission(missionsDir, "m1", [
			{
				id: "manager-1",
				displayName: "Manager",
				roleDescription: "Lead",
				systemRole: "manager",
			},
		]);

		await expect(
			assertManager({
				missionsDir,
				missionId: "m1",
				agentId: "missing",
			}),
		).rejects.toThrow("Agent not found");
	});
});
