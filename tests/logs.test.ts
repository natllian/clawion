import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { readJson } from "../src/core/fs/json";
import { logSchema } from "../src/core/schemas";
import { addLogEvent } from "../src/core/workspace/logs";
import { createMissionFixture, createWorkspace } from "./helpers";

describe("logs", () => {
	it("adds log events", async () => {
		const missionsDir = await createWorkspace();
		await createMissionFixture(missionsDir, "m1");

		const eventId = await addLogEvent({
			missionsDir,
			missionId: "m1",
			workerId: "worker-1",
			level: "info",
			type: "task:update",
			message: "Updated task",
		});

		const logPath = join(missionsDir, "m1", "logs", "worker-1.json");
		const logFile = await readJson(logPath, logSchema);
		expect(logFile.events).toHaveLength(1);
		expect(logFile.events[0].id).toBe(eventId);
	});
});
