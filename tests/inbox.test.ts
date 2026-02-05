import { describe, expect, it } from "vitest";
import { appendInboxAck, listInboxAcks } from "../src/core/workspace/inbox";
import { createMissionFixture, createWorkspace } from "./helpers";

describe("inbox ack", () => {
	it("appends and lists ack events", async () => {
		const missionsDir = await createWorkspace();
		await createMissionFixture(missionsDir, "m1");

		await appendInboxAck({
			missionsDir,
			missionId: "m1",
			agentId: "agent-1",
			messageId: "msg-1",
			taskId: "t1",
		});
		await appendInboxAck({
			missionsDir,
			missionId: "m1",
			agentId: "agent-1",
			messageId: "msg-1",
			taskId: "t1",
		});

		const acks = await listInboxAcks(missionsDir, "m1", "agent-1");
		expect(acks).toHaveLength(2);
		expect(acks[0].messageId).toBe("msg-1");
	});

	it("returns empty list when inbox file is missing", async () => {
		const missionsDir = await createWorkspace();
		await createMissionFixture(missionsDir, "m1");

		const acks = await listInboxAcks(missionsDir, "m1", "ghost-agent");
		expect(acks).toEqual([]);
	});
});
