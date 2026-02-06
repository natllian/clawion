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
import { nowLocal } from "../src/core/time";

describe("schemas", () => {
	it("accepts valid mission", () => {
		const result = missionSchema.safeParse({
			schemaVersion: 1,
			id: "m1",
			name: "Test Mission",
			status: "active",
			createdAt: nowLocal(),
			updatedAt: nowLocal(),
		});
		expect(result.success).toBe(true);
	});

	it("accepts mission with legacy description field", () => {
		const result = missionSchema.safeParse({
			schemaVersion: 1,
			id: "m1",
			name: "Test Mission",
			description: "deprecated",
			status: "active",
			createdAt: nowLocal(),
			updatedAt: nowLocal(),
		});
		expect(result.success).toBe(true);
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
					createdAt: nowLocal(),
					updatedAt: nowLocal(),
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
					createdAt: nowLocal(),
					updatedAt: nowLocal(),
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

	it("rejects agents with status field", () => {
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
		expect(result.success).toBe(false);
	});

	it("requires mentions to be a list", () => {
		const result = threadMessageEventSchema.safeParse({
			type: "message",
			id: "msg1",
			createdAt: nowLocal(),
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
			createdAt: nowLocal(),
			authorAgentId: "a1",
			mentionsAgentIds: [],
			content: "Hello",
		});
		expect(result.success).toBe(false);
	});

	it("accepts valid missions index", () => {
		const result = missionsIndexSchema.safeParse({
			schemaVersion: 1,
			updatedAt: nowLocal(),
			missions: [
				{
					id: "m1",
					name: "Mission 1",
					path: "/tmp/m1",
					status: "completed",
					createdAt: nowLocal(),
					updatedAt: nowLocal(),
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
			status: "completed",
			createdAt: nowLocal(),
			updatedAt: nowLocal(),
		});
		expect(result.success).toBe(true);
	});

	it("accepts valid inbox ack event", () => {
		const result = inboxAckEventSchema.safeParse({
			type: "ack",
			ackedAt: nowLocal(),
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
			createdAt: nowLocal(),
			agentId: "a1",
			content: "Investigating.",
		});
		expect(result.success).toBe(true);
	});
});
