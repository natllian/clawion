import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { readJson } from "../src/core/fs/json";
import { logSchema } from "../src/core/schemas";
import { addLogEvent, getLog } from "../src/core/workspace/logs";
import { createMissionFixture, createWorkspace } from "./helpers";

describe("logs", () => {
	it("adds log events", async () => {
		const missionsDir = await createWorkspace();
		await createMissionFixture(missionsDir, "m1");

		const eventId = await addLogEvent({
			missionsDir,
			missionId: "m1",
			agentId: "agent-1",
			level: "info",
			type: "task:update",
			message: "Updated task",
		});

		const secondEventId = await addLogEvent({
			missionsDir,
			missionId: "m1",
			agentId: "agent-1",
			level: "warn",
			type: "task:warn",
			message: "Second event",
		});

		const logPath = join(missionsDir, "m1", "logs", "agent-1.json");
		const logFile = await readJson(logPath, logSchema);
		expect(logFile.events).toHaveLength(2);
		expect(logFile.events[0].id).toBe(eventId);
		expect(logFile.events[1].id).toBe(secondEventId);
	});

	it("gets log for non-existent agent", async () => {
		const missionsDir = await createWorkspace();
		await createMissionFixture(missionsDir, "m1");

		const log = await getLog(missionsDir, "m1", "non-existent-agent");
		expect(log.agentId).toBe("non-existent-agent");
		expect(log.events).toEqual([]);
	});
});
