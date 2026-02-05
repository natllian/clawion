import { describe, expect, it } from "vitest";
import { readMemory, setMemory } from "../src/core/workspace/memory";
import { createMissionFixture, createWorkspace } from "./helpers";

describe("memory", () => {
	it("writes and reads memory", async () => {
		const missionsDir = await createWorkspace();
		await createMissionFixture(missionsDir, "m1");

		await setMemory({
			missionsDir,
			missionId: "m1",
			agentId: "agent-1",
			content: "# Summary\n- Done",
		});

		const content = await readMemory(missionsDir, "m1", "agent-1");
		expect(content).toContain("Summary");
	});

	it("returns empty string when memory is missing", async () => {
		const missionsDir = await createWorkspace();
		await createMissionFixture(missionsDir, "m1");

		const content = await readMemory(missionsDir, "m1", "ghost-agent");
		expect(content).toBe("");
	});
});
