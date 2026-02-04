import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { readJson } from "../src/core/fs/json";
import { threadSchema } from "../src/core/schemas";
import {
	addThreadMessage,
	createThread,
	getThread,
	listThreads,
	resolveThreadMessage,
	unresolveThreadMessage,
} from "../src/core/workspace/threads";
import { createMissionFixture, createWorkspace } from "./helpers";

describe("threads", () => {
	it("adds and resolves thread messages", async () => {
		const missionsDir = await createWorkspace();
		await createMissionFixture(missionsDir, "m1");

		const messageId = await addThreadMessage({
			missionsDir,
			missionId: "m1",
			taskId: "t1",
			title: "Thread for t1",
			authorId: "manager-1",
			mentions: "worker-1",
			content: "Please review.",
		});
		await addThreadMessage({
			missionsDir,
			missionId: "m1",
			taskId: "t1",
			title: "Thread for t1",
			authorId: "manager-1",
			mentions: "worker-2",
			content: "Second message.",
		});

		const threadPath = join(missionsDir, "m1", "threads", "t1.json");
		let thread = await readJson(threadPath, threadSchema);
		expect(thread.messages).toHaveLength(2);
		expect(thread.messages[0].resolved).toBe(false);

		await resolveThreadMessage(missionsDir, "m1", "t1", messageId, "worker-1");

		thread = await readJson(threadPath, threadSchema);
		expect(thread.messages[0].resolved).toBe(true);
		expect(thread.messages[1].resolved).toBe(false);

		await unresolveThreadMessage(missionsDir, "m1", "t1", messageId);
		thread = await readJson(threadPath, threadSchema);
		expect(thread.messages[0].resolved).toBe(false);
	});

	it("throws when resolving missing messages", async () => {
		const missionsDir = await createWorkspace();
		await createMissionFixture(missionsDir, "m1");

		await expect(
			resolveThreadMessage(missionsDir, "m1", "t1", "missing", "worker-1"),
		).rejects.toThrow("Message not found");

		await expect(
			unresolveThreadMessage(missionsDir, "m1", "t1", "missing"),
		).rejects.toThrow("Message not found");
	});

	it("creates a new thread for non-existent task", async () => {
		const missionsDir = await createWorkspace();
		await createMissionFixture(missionsDir, "m1");

		const thread = await getThread(missionsDir, "m1", "new-task");
		expect(thread.taskId).toBe("new-task");
		expect(thread.title).toBe("New Thread");
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
			title: "Thread A",
			authorId: "manager-1",
			mentions: "worker-1",
			content: "Message A",
		});
		await addThreadMessage({
			missionsDir,
			missionId: "m1",
			taskId: "task-b",
			title: "Thread B",
			authorId: "worker-1",
			mentions: "manager-1",
			content: "Message B",
		});

		const threads = await listThreads(missionsDir, "m1");
		expect(threads).toHaveLength(2);
		expect(threads.map((t) => t.taskId).sort()).toEqual(["task-a", "task-b"]);
	});

	it("lists empty array when no threads directory exists", async () => {
		const missionsDir = await createWorkspace();
		await createMissionFixture(missionsDir, "m1");

		// Create a fresh mission without threads directory
		const threads = await listThreads(missionsDir, "m1");
		expect(threads).toEqual([]);
	});

	it("throws when creating thread that already exists", async () => {
		const missionsDir = await createWorkspace();
		await createMissionFixture(missionsDir, "m1");

		await addThreadMessage({
			missionsDir,
			missionId: "m1",
			taskId: "existing-task",
			title: "Thread",
			authorId: "manager-1",
			mentions: "worker-1",
			content: "First message",
		});

		await expect(
			createThread({
				missionsDir,
				missionId: "m1",
				taskId: "existing-task",
				title: "Duplicate",
				authorId: "manager-1",
				mentions: "worker-1",
				content: "Should fail",
			}),
		).rejects.toThrow("Thread already exists");
	});
});
