import { describe, expect, it } from "vitest";
import {
	agentsSchema,
	logSchema,
	missionSchema,
	missionsIndexSchema,
	tasksSchema,
	threadSchema,
} from "../src/core/schemas";

describe("schemas", () => {
	it("accepts valid mission", () => {
		const result = missionSchema.safeParse({
			schemaVersion: 1,
			id: "m1",
			name: "Test Mission",
			description: "A mission",
			status: "active",
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		});
		expect(result.success).toBe(true);
	});

	it("rejects mission without description", () => {
		const result = missionSchema.safeParse({
			schemaVersion: 1,
			id: "m1",
			name: "Test Mission",
			status: "active",
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		});
		expect(result.success).toBe(false);
	});

	it("accepts valid tasks file", () => {
		const result = tasksSchema.safeParse({
			schemaVersion: 1,
			description: "Tasks",
			columns: [{ id: "todo", name: "Todo", order: 1 }],
			tasks: [
				{
					id: "t1",
					title: "Task 1",
					description: "Do something",
					columnId: "todo",
					statusNotes: "",
					assigneeAgentId: "a1",
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
				},
			],
		});
		expect(result.success).toBe(true);
	});

	it("rejects tasks with forbidden fields", () => {
		const result = tasksSchema.safeParse({
			schemaVersion: 1,
			description: "Tasks",
			columns: [{ id: "todo", name: "Todo", order: 1 }],
			tasks: [
				{
					id: "t1",
					title: "Task 1",
					description: "Do something",
					columnId: "todo",
					statusNotes: "",
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
					links: ["http://example.com"],
				},
			],
		});
		expect(result.success).toBe(false);
	});

	it("accepts valid agents file", () => {
		const result = agentsSchema.safeParse({
			schemaVersion: 1,
			agents: [
				{
					id: "a1",
					displayName: "Agent One",
					roleDescription: "Lead",
					systemRole: "manager",
					status: "active",
				},
			],
		});
		expect(result.success).toBe(true);
	});

	it("accepts agents file without a manager", () => {
		const result = agentsSchema.safeParse({
			schemaVersion: 1,
			agents: [
				{
					id: "a1",
					displayName: "Agent One",
					roleDescription: "Contributor",
					systemRole: "worker",
					status: "active",
				},
			],
		});
		expect(result.success).toBe(true);
	});

	it("accepts empty agents file", () => {
		const result = agentsSchema.safeParse({
			schemaVersion: 1,
			agents: [],
		});
		expect(result.success).toBe(true);
	});

	it("requires mentions to be a string", () => {
		const result = threadSchema.safeParse({
			schemaVersion: 1,
			taskId: "t1",
			title: "Test Thread",
			creatorAgentId: "a1",
			status: "open",
			messages: [
				{
					id: "msg1",
					createdAt: new Date().toISOString(),
					authorAgentId: "a1",
					mentionsAgentId: ["a2"],
					content: "Hello",
					resolved: false,
				},
			],
		});
		expect(result.success).toBe(false);
	});

	it("requires resolvedAt/resolvedBy when resolved", () => {
		const result = threadSchema.safeParse({
			schemaVersion: 1,
			taskId: "t1",
			title: "Test Thread",
			creatorAgentId: "a1",
			status: "open",
			messages: [
				{
					id: "msg1",
					createdAt: new Date().toISOString(),
					authorAgentId: "a1",
					mentionsAgentId: "a2",
					content: "Hello",
					resolved: true,
				},
			],
		});
		expect(result.success).toBe(false);
	});

	it("accepts resolved messages with resolvedAt/resolvedBy", () => {
		const result = threadSchema.safeParse({
			schemaVersion: 1,
			taskId: "t1",
			title: "Test Thread",
			creatorAgentId: "a1",
			status: "resolved",
			messages: [
				{
					id: "msg1",
					createdAt: new Date().toISOString(),
					authorAgentId: "a1",
					mentionsAgentId: "a2",
					content: "Hello",
					resolved: true,
					resolvedAt: new Date().toISOString(),
					resolvedByAgentId: "a2",
				},
			],
		});
		expect(result.success).toBe(true);
	});

	it("rejects resolvedAt/resolvedBy when resolved is false", () => {
		const result = threadSchema.safeParse({
			schemaVersion: 1,
			taskId: "t1",
			title: "Test Thread",
			creatorAgentId: "a1",
			status: "open",
			messages: [
				{
					id: "msg1",
					createdAt: new Date().toISOString(),
					authorAgentId: "a1",
					mentionsAgentId: "a2",
					content: "Hello",
					resolved: false,
					resolvedAt: new Date().toISOString(),
					resolvedByAgentId: "a2",
				},
			],
		});
		expect(result.success).toBe(false);
	});

	it("accepts valid log file", () => {
		const result = logSchema.safeParse({
			schemaVersion: 1,
			agentId: "a1",
			events: [
				{
					id: "e1",
					timestamp: new Date().toISOString(),
					level: "info",
					type: "task:update",
					message: "Updated task",
					refs: {
						missionId: "m1",
					},
				},
			],
		});
		expect(result.success).toBe(true);
	});

	it("accepts valid missions index", () => {
		const result = missionsIndexSchema.safeParse({
			schemaVersion: 1,
			updatedAt: new Date().toISOString(),
			missions: [
				{
					id: "m1",
					name: "Mission 1",
					description: "Desc",
					path: "/tmp/m1",
					status: "completed",
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
				},
			],
		});
		expect(result.success).toBe(true);
	});

	it("accepts completed mission status", () => {
		const result = missionSchema.safeParse({
			schemaVersion: 1,
			id: "m1",
			name: "Test Mission",
			description: "A mission",
			status: "completed",
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		});
		expect(result.success).toBe(true);
	});

	it("rejects reopenedAt without reopenedBy when resolved is false", () => {
		const result = threadSchema.safeParse({
			schemaVersion: 1,
			taskId: "t1",
			title: "Test Thread",
			creatorAgentId: "a1",
			status: "open",
			messages: [
				{
					id: "msg1",
					createdAt: new Date().toISOString(),
					authorAgentId: "a1",
					mentionsAgentId: "a2",
					content: "Hello",
					resolved: false,
					reopenedAt: new Date().toISOString(),
				},
			],
		});
		expect(result.success).toBe(false);
	});

	it("rejects reopenedBy without reopenedAt when resolved is false", () => {
		const result = threadSchema.safeParse({
			schemaVersion: 1,
			taskId: "t1",
			title: "Test Thread",
			creatorAgentId: "a1",
			status: "open",
			messages: [
				{
					id: "msg1",
					createdAt: new Date().toISOString(),
					authorAgentId: "a1",
					mentionsAgentId: "a2",
					content: "Hello",
					resolved: false,
					reopenedByAgentId: "a2",
				},
			],
		});
		expect(result.success).toBe(false);
	});

	it("accepts reopened messages with reopenedAt and reopenedBy", () => {
		const result = threadSchema.safeParse({
			schemaVersion: 1,
			taskId: "t1",
			title: "Test Thread",
			creatorAgentId: "a1",
			status: "open",
			messages: [
				{
					id: "msg1",
					createdAt: new Date().toISOString(),
					authorAgentId: "a1",
					mentionsAgentId: "a2",
					content: "Hello",
					resolved: false,
					reopenedAt: new Date().toISOString(),
					reopenedByAgentId: "a2",
				},
			],
		});
		expect(result.success).toBe(true);
	});

	it("rejects reopenedAt/reopenedBy when resolved is true", () => {
		const result = threadSchema.safeParse({
			schemaVersion: 1,
			taskId: "t1",
			title: "Test Thread",
			creatorAgentId: "a1",
			status: "resolved",
			messages: [
				{
					id: "msg1",
					createdAt: new Date().toISOString(),
					authorAgentId: "a1",
					mentionsAgentId: "a2",
					content: "Hello",
					resolved: true,
					resolvedAt: new Date().toISOString(),
					resolvedByAgentId: "a2",
					reopenedAt: new Date().toISOString(),
					reopenedByAgentId: "a3",
				},
			],
		});
		expect(result.success).toBe(false);
	});
});
