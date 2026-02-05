import { describe, expect, it } from "vitest";
import {
	appendWorkingEvent,
	listWorkingEvents,
} from "../src/core/workspace/working";
import { createMissionFixture, createWorkspace } from "./helpers";

describe("working events", () => {
	it("appends and lists working events", async () => {
		const missionsDir = await createWorkspace();
		await createMissionFixture(missionsDir, "m1");

		const first = await appendWorkingEvent({
			missionsDir,
			missionId: "m1",
			agentId: "agent-1",
			content: "Investigating the bug.",
		});

		const second = await appendWorkingEvent({
			missionsDir,
			missionId: "m1",
			agentId: "agent-1",
			content: "Found the root cause.",
		});

		const events = await listWorkingEvents(missionsDir, "m1", "agent-1");
		expect(events).toHaveLength(2);
		expect(events[0].id).toBe(first.id);
		expect(events[1].id).toBe(second.id);
	});

	it("returns empty list when no working file exists", async () => {
		const missionsDir = await createWorkspace();
		await createMissionFixture(missionsDir, "m1");

		const events = await listWorkingEvents(missionsDir, "m1", "ghost-agent");
		expect(events).toEqual([]);
	});
});
