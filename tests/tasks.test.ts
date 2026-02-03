import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { readJson } from "../src/core/fs/json";
import { tasksSchema } from "../src/core/schemas";
import {
	assignTask,
	createTask,
	listTasks,
	updateTask,
} from "../src/core/workspace/tasks";
import { createMissionFixture, createWorkspace } from "./helpers";

describe("tasks", () => {
	it("creates, updates, and assigns tasks", async () => {
		const missionsDir = await createWorkspace();
		await createMissionFixture(missionsDir, "m1");

		await createTask({
			missionsDir,
			missionId: "m1",
			id: "t1",
			title: "Task 1",
			description: "Do it",
		});

		await updateTask({
			missionsDir,
			missionId: "m1",
			id: "t1",
			statusNotes: "Blocked: waiting",
		});

		await assignTask(missionsDir, "m1", "t1", "worker-1");

		const tasksFile = await readJson(
			join(missionsDir, "m1", "tasks.json"),
			tasksSchema,
		);

		const task = tasksFile.tasks.find((entry) => entry.id === "t1");
		expect(task?.statusNotes).toBe("Blocked: waiting");
		expect(task?.assigneeId).toBe("worker-1");

		const listed = await listTasks(missionsDir, "m1");
		expect(listed.tasks).toHaveLength(1);
	});
});
