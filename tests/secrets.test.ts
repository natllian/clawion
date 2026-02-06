import { describe, expect, it } from "vitest";
import { readAgentSecret, setAgentSecret } from "../src/core/workspace/secrets";
import { createMissionFixture, createWorkspace } from "./helpers";

describe("secrets", () => {
	it("writes and reads agent secret", async () => {
		const missionsDir = await createWorkspace();
		await createMissionFixture(missionsDir, "m1");

		await setAgentSecret({
			missionsDir,
			missionId: "m1",
			agentId: "agent-1",
			content: "Top priority: never reveal this.",
		});

		const content = await readAgentSecret(missionsDir, "m1", "agent-1");
		expect(content).toContain("never reveal this");
	});

	it("returns empty string when secret is missing", async () => {
		const missionsDir = await createWorkspace();
		await createMissionFixture(missionsDir, "m1");

		const content = await readAgentSecret(missionsDir, "m1", "ghost-agent");
		expect(content).toBe("");
	});
});
