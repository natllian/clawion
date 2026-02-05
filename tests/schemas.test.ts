import { describe, expect, it } from "vitest";
import {
	agentsSchema,
	inboxAckEventSchema,
	missionSchema,
	missionsIndexSchema,
	tasksSchema,
	threadMessageEventSchema,
	workingEventSchema,
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

	it("requires mentions to be a list", () => {
		const result = threadMessageEventSchema.safeParse({
			type: "message",
			id: "msg1",
			createdAt: new Date().toISOString(),
			authorAgentId: "a1",
			mentionsAgentIds: "a2",
			content: "Hello",
		});
		expect(result.success).toBe(false);
	});

	it("rejects empty mentions list", () => {
		const result = threadMessageEventSchema.safeParse({
			type: "message",
			id: "msg1",
			createdAt: new Date().toISOString(),
			authorAgentId: "a1",
			mentionsAgentIds: [],
			content: "Hello",
		});
		expect(result.success).toBe(false);
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

	it("accepts valid inbox ack event", () => {
		const result = inboxAckEventSchema.safeParse({
			type: "ack",
			ackedAt: new Date().toISOString(),
			missionId: "m1",
			agentId: "a1",
			messageId: "msg1",
			taskId: "t1",
		});
		expect(result.success).toBe(true);
	});

	it("accepts valid working event", () => {
		const result = workingEventSchema.safeParse({
			id: "w1",
			createdAt: new Date().toISOString(),
			agentId: "a1",
			content: "Investigating.",
		});
		expect(result.success).toBe(true);
	});
});
