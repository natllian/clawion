import { describe, expect, it } from "vitest";
import {
	acknowledgeAllTaskMentions,
	appendInboxAck,
	listInboxAcks,
	listUnackedTaskMentions,
} from "../src/core/workspace/inbox";
import { addThreadMessage } from "../src/core/workspace/threads";
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

	it("lists unacknowledged mentions by message and agent", async () => {
		const missionsDir = await createWorkspace();
		await createMissionFixture(missionsDir, "m1");

		const firstMessageId = await addThreadMessage({
			missionsDir,
			missionId: "m1",
			taskId: "t1",
			authorAgentId: "manager-1",
			mentionsAgentIds: ["agent-1", "agent-2"],
			content: "Please confirm.",
		});

		const secondMessageId = await addThreadMessage({
			missionsDir,
			missionId: "m1",
			taskId: "t1",
			authorAgentId: "manager-1",
			mentionsAgentIds: ["agent-1"],
			content: "Need your update.",
		});

		await appendInboxAck({
			missionsDir,
			missionId: "m1",
			agentId: "agent-1",
			messageId: firstMessageId,
			taskId: "t1",
		});

		const pending = await listUnackedTaskMentions(missionsDir, "m1", "t1");
		expect(pending).toHaveLength(2);
		expect(pending[0]?.messageId).toBe(firstMessageId);
		expect(pending[0]?.unackedAgentIds).toEqual(["agent-2"]);
		expect(pending[1]?.messageId).toBe(secondMessageId);
		expect(pending[1]?.unackedAgentIds).toEqual(["agent-1"]);
	});

	it("manually acknowledges all pending mentions in a thread", async () => {
		const missionsDir = await createWorkspace();
		await createMissionFixture(missionsDir, "m1");

		const firstMessageId = await addThreadMessage({
			missionsDir,
			missionId: "m1",
			taskId: "t1",
			authorAgentId: "manager-1",
			mentionsAgentIds: ["agent-1", "agent-2"],
			content: "Please confirm.",
		});
		await addThreadMessage({
			missionsDir,
			missionId: "m1",
			taskId: "t1",
			authorAgentId: "manager-1",
			mentionsAgentIds: ["agent-1"],
			content: "Need your update.",
		});

		await appendInboxAck({
			missionsDir,
			missionId: "m1",
			agentId: "agent-1",
			messageId: firstMessageId,
			taskId: "t1",
		});

		const result = await acknowledgeAllTaskMentions(missionsDir, "m1", "t1");
		expect(result.ackedMessages).toBe(2);
		expect(result.ackedEntries).toBe(2);
		expect(result.ackedAgents).toBe(2);

		const pendingAfter = await listUnackedTaskMentions(missionsDir, "m1", "t1");
		expect(pendingAfter).toEqual([]);
	});
});
