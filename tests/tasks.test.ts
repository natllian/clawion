import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { readJson, writeJsonAtomic } from "../src/core/fs/json";
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

		await createTask({
			missionsDir,
			missionId: "m1",
			id: "t2",
			title: "Task 2",
			description: "Do it again",
		});

		await updateTask({
			missionsDir,
			missionId: "m1",
			id: "t1",
			statusNotes: "Blocked: waiting",
		});

		await updateTask({
			missionsDir,
			missionId: "m1",
			id: "t1",
			columnId: "doing",
		});

		await assignTask(missionsDir, "m1", "t1", "worker-1");

		const tasksFile = await readJson(
			join(missionsDir, "m1", "tasks.json"),
			tasksSchema,
		);

		const task = tasksFile.tasks.find((entry) => entry.id === "t1");
		expect(task?.statusNotes).toBe("Blocked: waiting");
		expect(task?.assigneeId).toBe("worker-1");
		expect(task?.columnId).toBe("doing");

		const listed = await listTasks(missionsDir, "m1");
		expect(listed.tasks).toHaveLength(2);
	});

	it("rejects duplicate and missing tasks", async () => {
		const missionsDir = await createWorkspace();
		await createMissionFixture(missionsDir, "m1");

		await createTask({
			missionsDir,
			missionId: "m1",
			id: "t1",
			title: "Task 1",
			description: "Do it",
		});

		await expect(
			createTask({
				missionsDir,
				missionId: "m1",
				id: "t1",
				title: "Task 1",
				description: "Do it",
			}),
		).rejects.toThrow("Task already exists");

		await expect(
			updateTask({
				missionsDir,
				missionId: "m1",
				id: "missing",
				statusNotes: "Nope",
			}),
		).rejects.toThrow("Task not found");

		await expect(
			assignTask(missionsDir, "m1", "missing", "worker-1"),
		).rejects.toThrow("Task not found");
	});

	it("rejects creating tasks when no columns are available", async () => {
		const missionsDir = await createWorkspace();
		await createMissionFixture(missionsDir, "m1");

		await writeJsonAtomic(join(missionsDir, "m1", "tasks.json"), {
			schemaVersion: 1,
			description: "Empty columns",
			columns: [],
			tasks: [],
		});

		await expect(
			createTask({
				missionsDir,
				missionId: "m1",
				id: "t2",
				title: "Task 2",
				description: "No columns",
			}),
		).rejects.toThrow("No columns available");
	});
});
