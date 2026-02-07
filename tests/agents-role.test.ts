import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { NotFoundError } from "../src/core/errors";
import { readJson } from "../src/core/fs/json";
import { agentsSchema } from "../src/core/schemas";
import {
	addAgent,
	listAgents,
	setAgentRoleDescription,
} from "../src/core/workspace/agents";
import { createMissionFixture, createWorkspace } from "./helpers";

async function setupMissionWithAgent(missionsDir: string) {
	await createMissionFixture(missionsDir, "m1");
	const missionDir = join(missionsDir, "m1");

	await addAgent(missionDir, {
		id: "agent-1",
		displayName: "Alice",
		roleDescription: "Original role",
		systemRole: "worker",
	});

	return missionDir;
}

describe("setAgentRoleDescription", () => {
	it("updates an existing agent's role description", async () => {
		const missionsDir = await createWorkspace();
		const missionDir = await setupMissionWithAgent(missionsDir);

		const result = await setAgentRoleDescription({
			missionDir,
			agentId: "agent-1",
			roleDescription: "Updated role description",
		});

		expect(result.roleDescription).toBe("Updated role description");

		// Verify persisted on disk
		const agentsFile = await readJson(
			join(missionDir, "agents.json"),
			agentsSchema,
		);
		const updated = agentsFile.agents.find((a) => a.id === "agent-1");
		expect(updated?.roleDescription).toBe("Updated role description");
	});

	it("throws NotFoundError for missing agent", async () => {
		const missionsDir = await createWorkspace();
		const missionDir = await setupMissionWithAgent(missionsDir);

		await expect(
			setAgentRoleDescription({
				missionDir,
				agentId: "nonexistent",
				roleDescription: "Should fail",
			}),
		).rejects.toThrow(NotFoundError);
	});

	it("preserves other agents when updating one", async () => {
		const missionsDir = await createWorkspace();
		const missionDir = await setupMissionWithAgent(missionsDir);

		await addAgent(missionDir, {
			id: "agent-2",
			displayName: "Bob",
			roleDescription: "Bob's role",
			systemRole: "worker",
		});

		await setAgentRoleDescription({
			missionDir,
			agentId: "agent-1",
			roleDescription: "New Alice role",
		});

		const agentsFile = await readJson(
			join(missionDir, "agents.json"),
			agentsSchema,
		);
		expect(agentsFile.agents).toHaveLength(2);
		expect(
			agentsFile.agents.find((a) => a.id === "agent-2")?.roleDescription,
		).toBe("Bob's role");
		expect(
			agentsFile.agents.find((a) => a.id === "agent-1")?.roleDescription,
		).toBe("New Alice role");
	});
});

describe("addAgent edge cases", () => {
	it("trims whitespace from roleDescription", async () => {
		const missionsDir = await createWorkspace();
		await createMissionFixture(missionsDir, "m1");
		const missionDir = join(missionsDir, "m1");

		await addAgent(missionDir, {
			id: "agent-1",
			displayName: "Alice",
			roleDescription: "  Trimmed role  ",
			systemRole: "worker",
		});

		const agentsFile = await readJson(
			join(missionDir, "agents.json"),
			agentsSchema,
		);
		expect(agentsFile.agents[0].roleDescription).toBe("Trimmed role");
	});

	it("uses default for manager with empty roleDescription", async () => {
		const missionsDir = await createWorkspace();
		await createMissionFixture(missionsDir, "m1");
		const missionDir = join(missionsDir, "m1");

		await addAgent(missionDir, {
			id: "mgr",
			displayName: "Manager",
			roleDescription: "   ", // whitespace-only
			systemRole: "manager",
		});

		const agentsFile = await readJson(
			join(missionDir, "agents.json"),
			agentsSchema,
		);
		expect(agentsFile.agents[0].roleDescription).toContain("Mission Manager");
	});

	it("throws for worker with whitespace-only roleDescription", async () => {
		const missionsDir = await createWorkspace();
		await createMissionFixture(missionsDir, "m1");
		const missionDir = join(missionsDir, "m1");

		await expect(
			addAgent(missionDir, {
				id: "agent-1",
				displayName: "Alice",
				roleDescription: "   ",
				systemRole: "worker",
			}),
		).rejects.toThrow("roleDescription is required");
	});
});

describe("listAgents edge cases", () => {
	it("returns empty agents for freshly initialized mission", async () => {
		const missionsDir = await createWorkspace();
		await createMissionFixture(missionsDir, "m1");
		const missionDir = join(missionsDir, "m1");

		const agentsFile = await listAgents(missionDir);
		expect(agentsFile.agents).toHaveLength(0);
	});
});
