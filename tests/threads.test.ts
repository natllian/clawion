import { describe, expect, it } from "vitest";
import {
	addThreadMessage,
	getThread,
	listThreadMessages,
	listThreads,
} from "../src/core/workspace/threads";
import { createMissionFixture, createWorkspace } from "./helpers";

describe("threads", () => {
	it("adds thread messages", async () => {
		const missionsDir = await createWorkspace();
		await createMissionFixture(missionsDir, "m1");

		await addThreadMessage({
			missionsDir,
			missionId: "m1",
			taskId: "t1",
			authorAgentId: "manager-1",
			mentionsAgentIds: ["agent-1"],
			content: "Please review.",
		});
		await addThreadMessage({
			missionsDir,
			missionId: "m1",
			taskId: "t1",
			authorAgentId: "manager-1",
			mentionsAgentIds: ["agent-2", "agent-3"],
			content: "Second message.",
		});

		const messages = await listThreadMessages(missionsDir, "m1", "t1");
		expect(messages).toHaveLength(2);
		expect(messages[0].mentionsAgentIds).toEqual(["agent-1"]);
		expect(messages[1].mentionsAgentIds).toEqual(["agent-2", "agent-3"]);
	});

	it("returns empty messages for non-existent thread file", async () => {
		const missionsDir = await createWorkspace();
		await createMissionFixture(missionsDir, "m1");

		const thread = await getThread(missionsDir, "m1", "new-task");
		expect(thread.taskId).toBe("new-task");
		expect(thread.messages).toEqual([]);
	});

	it("lists all threads in mission", async () => {
		const missionsDir = await createWorkspace();
		await createMissionFixture(missionsDir, "m1");

		// Add messages for multiple tasks
		await addThreadMessage({
			missionsDir,
			missionId: "m1",
			taskId: "task-a",
			authorAgentId: "manager-1",
			mentionsAgentIds: ["agent-1"],
			content: "Message A",
		});
		await addThreadMessage({
			missionsDir,
			missionId: "m1",
			taskId: "task-b",
			authorAgentId: "agent-1",
			mentionsAgentIds: ["manager-1"],
			content: "Message B",
		});

		const threads = await listThreads(missionsDir, "m1");
		expect(threads).toHaveLength(2);
		expect(threads.map((t) => t.taskId).sort()).toEqual(["task-a", "task-b"]);
	});

	it("lists empty array when there are no thread files", async () => {
		const missionsDir = await createWorkspace();
		await createMissionFixture(missionsDir, "m1");

		const threads = await listThreads(missionsDir, "m1");
		expect(threads).toEqual([]);
	});
});
