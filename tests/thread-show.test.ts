import { mkdir, writeFile } from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";
import { runThreadShow } from "../src/cli/thread-show";
import { createWorkspace } from "./helpers";

describe("thread-show", () => {
	it("shows thread with messages", async () => {
		const missionsDir = await createWorkspace();

		// Create mission directly
		const missionPath = `${missionsDir}/mission-test`;
		await mkdir(missionPath, { recursive: true });

		// Create index.json
		await writeFile(
			`${missionsDir}/index.json`,
			JSON.stringify({
				schemaVersion: 1,
				updatedAt: "2026-02-06 10:00:00",
				missions: [
					{
						id: "mission-test",
						name: "Mission One",
						path: missionPath,
						status: "active",
						createdAt: "2026-02-06 10:00:00",
						updatedAt: "2026-02-06 10:00:00",
					},
				],
			}),
		);

		// Create tasks file
		await writeFile(
			`${missionPath}/tasks.json`,
			JSON.stringify({
				schemaVersion: 1,
				description: "Tasks",
				columns: [{ id: "pending", name: "Pending", order: 1 }],
				tasks: [
					{
						id: "task-a",
						title: "Test Task",
						description: "Description",
						columnId: "pending",
						statusNotes: "",
						createdAt: "2026-02-06 10:00:00",
						updatedAt: "2026-02-06 10:00:00",
					},
				],
			}),
		);

		// Create threads directory with message
		const threadsDir = `${missionPath}/threads`;
		await mkdir(threadsDir, { recursive: true });
		await writeFile(
			`${threadsDir}/task-a.jsonl`,
			JSON.stringify({
				type: "message",
				id: "msg-1",
				createdAt: "2026-02-06 12:00:00",
				authorAgentId: "agent-1",
				mentionsAgentIds: ["agent-2"],
				content: "Hello @agent-2",
			}),
		);

		const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

		await runThreadShow({
			missionsDir,
			missionId: "mission-test",
			taskId: "task-a",
		});

		expect(logSpy).toHaveBeenCalled();
		const output = logSpy.mock.calls[0][0];
		expect(output).toContain("Thread for Task: task-a");
		expect(output).toContain("Test Task");
		expect(output).toContain("@agent-1");
		expect(output).toContain("mentions: @agent-2");
		expect(output).toContain("Hello @agent-2");
	});

	it("shows empty-thread placeholder when no messages exist", async () => {
		const missionsDir = await createWorkspace();
		const missionPath = `${missionsDir}/mission-empty`;
		await mkdir(missionPath, { recursive: true });

		await writeFile(
			`${missionsDir}/index.json`,
			JSON.stringify({
				schemaVersion: 1,
				updatedAt: "2026-02-06 10:00:00",
				missions: [
					{
						id: "mission-empty",
						name: "Mission Empty",
						path: missionPath,
						status: "active",
						createdAt: "2026-02-06 10:00:00",
						updatedAt: "2026-02-06 10:00:00",
					},
				],
			}),
		);

		await writeFile(
			`${missionPath}/tasks.json`,
			JSON.stringify({
				schemaVersion: 1,
				description: "Tasks",
				columns: [{ id: "pending", name: "Pending", order: 1 }],
				tasks: [
					{
						id: "task-empty",
						title: "Empty Task",
						description: "Description",
						columnId: "pending",
						statusNotes: "",
						createdAt: "2026-02-06 10:00:00",
						updatedAt: "2026-02-06 10:00:00",
					},
				],
			}),
		);

		const threadsDir = `${missionPath}/threads`;
		await mkdir(threadsDir, { recursive: true });
		await writeFile(`${threadsDir}/task-empty.jsonl`, "");

		const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

		await runThreadShow({
			missionsDir,
			missionId: "mission-empty",
			taskId: "task-empty",
		});

		const output = logSpy.mock.calls.at(-1)?.[0] as string;
		expect(output).toContain("Thread for Task: task-empty");
		expect(output).toContain("0 messages");
		expect(output).toContain("_No messages in this thread._");
	});
});
