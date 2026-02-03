import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { readJson } from "../src/core/fs/json";
import { threadSchema } from "../src/core/schemas";
import {
	addThreadMessage,
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
			authorId: "manager-1",
			mentions: "worker-1",
			content: "Please review.",
		});
		await addThreadMessage({
			missionsDir,
			missionId: "m1",
			taskId: "t1",
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
});
