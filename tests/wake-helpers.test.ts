import { describe, expect, it } from "vitest";
import { buildReplyHereCommand, groupUnreadMentions } from "../src/cli/wake";

describe("wake helpers", () => {
	describe("buildReplyHereCommand", () => {
		it("builds command with single mention", () => {
			const cmd = buildReplyHereCommand("m1", "t1", "agent-1", ["agent-2"]);
			expect(cmd).toBe(
				'clawion message add --mission m1 --task t1 --content "..." --mentions agent-2 --agent agent-1',
			);
		});

		it("builds command with multiple mentions", () => {
			const cmd = buildReplyHereCommand("m1", "t1", "agent-1", [
				"agent-2",
				"agent-3",
			]);
			expect(cmd).toBe(
				'clawion message add --mission m1 --task t1 --content "..." --mentions agent-2,agent-3 --agent agent-1',
			);
		});
	});

	describe("groupUnreadMentions", () => {
		it("groups mentions by task", () => {
			const mentions = [
				{
					taskId: "t1",
					messageId: "m1",
					authorAgentId: "a1",
					mentionsAgentIds: [],
					content: "hello",
					createdAt: "2026-02-06 10:00:00",
				},
				{
					taskId: "t2",
					messageId: "m2",
					authorAgentId: "a2",
					mentionsAgentIds: [],
					content: "world",
					createdAt: "2026-02-06 11:00:00",
				},
				{
					taskId: "t1",
					messageId: "m3",
					authorAgentId: "a1",
					mentionsAgentIds: [],
					content: "again",
					createdAt: "2026-02-06 12:00:00",
				},
			];

			const result = groupUnreadMentions(mentions);

			expect(result.byTask.size).toBe(2);
			expect(result.byTask.get("t1")).toHaveLength(2);
			expect(result.byTask.get("t2")).toHaveLength(1);
			expect(result.taskIdsOrdered).toEqual(["t1", "t2"]);
		});

		it("orders tasks by first mention time", () => {
			const mentions = [
				{
					taskId: "t2",
					messageId: "m1",
					authorAgentId: "a1",
					mentionsAgentIds: [],
					content: "later",
					createdAt: "2026-02-06 12:00:00",
				},
				{
					taskId: "t1",
					messageId: "m2",
					authorAgentId: "a1",
					mentionsAgentIds: [],
					content: "earlier",
					createdAt: "2026-02-06 10:00:00",
				},
			];

			const result = groupUnreadMentions(mentions);

			expect(result.taskIdsOrdered).toEqual(["t1", "t2"]);
		});

		it("handles empty array", () => {
			const result = groupUnreadMentions([]);

			expect(result.byTask.size).toBe(0);
			expect(result.taskIdsOrdered).toEqual([]);
		});
	});
});

describe("buildWakeLines", () => {
	it("includes dark secret when set for worker", async () => {
		// This test verifies the dark secret rendering path
		const { buildWorkerWakeLines } = await import("../src/cli/wake");

		const ctx: Parameters<typeof buildWorkerWakeLines>[0] = {
			missionId: "m1",
			agentId: "worker-1",
			missionsDir: "/tmp",
			missionPath: "/tmp/m1",
			generatedAt: "2026-02-06 12:00:00",
			agentEntry: {
				id: "worker-1",
				displayName: "Worker",
				systemRole: "worker",
				roleDescription: "Worker desc",
			},
			agents: [],
			mission: { id: "m1", name: "Mission", status: "active" },
			roadmap: "# Roadmap",
			allTasks: [],
			assignedTasks: [],
			unreadMentions: [],
			unreadMentionsByTask: new Map(),
			unreadTaskIdsOrdered: [],
			taskTitleById: new Map(),
			workingEvents: [],
			darkSecret: "confidential info",
			threadSummaries: [],
			teamWorkingLatest: [],
		};

		const lines = buildWorkerWakeLines(ctx);
		const output = lines.join("\n");

		expect(output).toContain("Dark Secret");
		expect(output).toContain("confidential info");
	});

	it("includes dark secret when set for manager", async () => {
		const { buildManagerWakeLines } = await import("../src/cli/wake");

		const ctx: Parameters<typeof buildManagerWakeLines>[0] = {
			missionId: "m1",
			agentId: "manager-1",
			missionsDir: "/tmp",
			missionPath: "/tmp/m1",
			generatedAt: "2026-02-06 12:00:00",
			agentEntry: {
				id: "manager-1",
				displayName: "Manager",
				systemRole: "manager",
				roleDescription: "Manager desc",
			},
			agents: [],
			mission: { id: "m1", name: "Mission", status: "active" },
			roadmap: "# Roadmap",
			allTasks: [],
			assignedTasks: [],
			unreadMentions: [],
			unreadMentionsByTask: new Map(),
			unreadTaskIdsOrdered: [],
			taskTitleById: new Map(),
			workingEvents: [],
			darkSecret: "manager secret",
			threadSummaries: [],
			teamWorkingLatest: [],
		};

		const lines = buildManagerWakeLines(ctx);
		const output = lines.join("\n");

		expect(output).toContain("Dark Secret");
		expect(output).toContain("manager secret");
	});

	it("excludes dark secret section when empty for worker", async () => {
		const { buildWorkerWakeLines } = await import("../src/cli/wake");

		const ctx: Parameters<typeof buildWorkerWakeLines>[0] = {
			missionId: "m1",
			agentId: "worker-1",
			missionsDir: "/tmp",
			missionPath: "/tmp/m1",
			generatedAt: "2026-02-06 12:00:00",
			agentEntry: {
				id: "worker-1",
				displayName: "Worker",
				systemRole: "worker",
				roleDescription: "Worker desc",
			},
			agents: [],
			mission: { id: "m1", name: "Mission", status: "active" },
			roadmap: "# Roadmap",
			allTasks: [],
			assignedTasks: [],
			unreadMentions: [],
			unreadMentionsByTask: new Map(),
			unreadTaskIdsOrdered: [],
			taskTitleById: new Map(),
			workingEvents: [],
			darkSecret: "",
			threadSummaries: [],
			teamWorkingLatest: [],
		};

		const lines = buildWorkerWakeLines(ctx);
		const output = lines.join("\n");

		expect(output).not.toContain("Dark Secret");
	});

	it("shows empty state messages", async () => {
		const { buildWorkerWakeLines } = await import("../src/cli/wake");

		const ctx: Parameters<typeof buildWorkerWakeLines>[0] = {
			missionId: "m1",
			agentId: "worker-1",
			missionsDir: "/tmp",
			missionPath: "/tmp/m1",
			generatedAt: "2026-02-06 12:00:00",
			agentEntry: {
				id: "worker-1",
				displayName: "Worker",
				systemRole: "worker",
				roleDescription: "Worker desc",
			},
			agents: [],
			mission: { id: "m1", name: "Mission", status: "active" },
			roadmap: "",
			allTasks: [],
			assignedTasks: [],
			unreadMentions: [],
			unreadMentionsByTask: new Map(),
			unreadTaskIdsOrdered: [],
			taskTitleById: new Map(),
			workingEvents: [],
			darkSecret: "",
			threadSummaries: [],
			teamWorkingLatest: [],
		};

		const lines = buildWorkerWakeLines(ctx);
		const output = lines.join("\n");

		expect(output).toContain("No roadmap yet");
		expect(output).toContain("No assigned tasks");
		expect(output).toContain("No agents registered");
	});
});
