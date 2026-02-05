import { mkdir, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { readJson, writeJsonAtomic } from "../src/core/fs/json";
import { agentsSchema } from "../src/core/schemas";
import {
	addAgent,
	listAgents,
	updateAgent,
} from "../src/core/workspace/agents";
import { DEFAULT_MANAGER_ROLE_DESCRIPTION } from "../src/core/workspace/roles";
import { createMissionFixture, createWorkspace } from "./helpers";

async function createMissionDir(): Promise<string> {
	const root = await mkdtemp(join(tmpdir(), "clawion-agents-"));
	const missionDir = join(root, "mission-a");
	await mkdir(missionDir, { recursive: true });

	await writeJsonAtomic(join(missionDir, "agents.json"), {
		schemaVersion: 1,
		agents: [],
	});

	return missionDir;
}

describe("addAgent", () => {
	it("adds a manager and fills default role description", async () => {
		const missionDir = await createMissionDir();

		await addAgent(missionDir, {
			id: "manager-1",
			displayName: "Manager",
			systemRole: "manager",
		});

		const agentsFile = await readJson(
			join(missionDir, "agents.json"),
			agentsSchema,
		);

		expect(agentsFile.agents).toHaveLength(1);
		expect(agentsFile.agents[0].roleDescription).toBe(
			DEFAULT_MANAGER_ROLE_DESCRIPTION,
		);
	});

	it("requires roleDescription for non-manager agents", async () => {
		const missionDir = await createMissionDir();

		await expect(
			addAgent(missionDir, {
				id: "agent-1",
				displayName: "Agent",
				systemRole: "worker",
			}),
		).rejects.toThrow("roleDescription is required");
	});

	it("rejects duplicate agents", async () => {
		const missionDir = await createMissionDir();

		await addAgent(missionDir, {
			id: "agent-1",
			displayName: "Agent",
			roleDescription: "Contributor",
			systemRole: "worker",
		});

		await expect(
			addAgent(missionDir, {
				id: "agent-1",
				displayName: "Agent",
				roleDescription: "Contributor",
				systemRole: "worker",
			}),
		).rejects.toThrow("Agent already exists");
	});
});

describe("agent updates", () => {
	it("updates agent data and lists agents", async () => {
		const missionsDir = await createWorkspace();
		await createMissionFixture(missionsDir, "m1");
		const missionDir = join(missionsDir, "m1");

		await addAgent(missionDir, {
			id: "agent-1",
			displayName: "Agent",
			roleDescription: "Contributor",
			systemRole: "worker",
		});
		await addAgent(missionDir, {
			id: "agent-2",
			displayName: "Agent Two",
			roleDescription: "Contributor",
			systemRole: "worker",
		});

		await updateAgent(missionDir, "agent-1", {
			displayName: "Agent Updated",
			status: "paused",
		});
		await updateAgent(missionDir, "agent-1", {
			roleDescription: "Updated role",
		});

		const agentsFile = await listAgents(missionDir);
		expect(agentsFile.agents[0].displayName).toBe("Agent Updated");
		expect(agentsFile.agents[0].status).toBe("paused");
		expect(agentsFile.agents[0].roleDescription).toBe("Updated role");
		expect(agentsFile.agents).toHaveLength(2);
	});

	it("rejects updates for missing agents", async () => {
		const missionsDir = await createWorkspace();
		await createMissionFixture(missionsDir, "m1");
		const missionDir = join(missionsDir, "m1");

		await expect(
			updateAgent(missionDir, "missing", {
				displayName: "Nope",
			}),
		).rejects.toThrow("Agent not found");
	});
});
