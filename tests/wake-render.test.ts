import { describe, expect, it } from "vitest";
import {
	buildReplyHereCommand,
	buildTaskTitleById,
	groupUnreadMentions,
	renderDarkSecret,
	renderTaskSection,
	renderTeamDirectory,
	renderUnreadMentions,
	renderWorking,
	type TaskWithStatus,
	type UnreadMention,
	type WakeContext,
} from "../src/cli/wake";
import type { Agent, WorkingEvent } from "../src/core/schemas";
import type { TaskStatus } from "../src/core/task-status";

describe("buildTaskTitleById", () => {
	it("builds a map of task id to title", () => {
		const tasks = {
			schemaVersion: 1 as const,
			description: "Tasks",
			columns: [],
			tasks: [
				{
					id: "t1",
					title: "Task One",
					description: "",
					columnId: "todo",
					statusNotes: "",
					createdAt: "2024-01-01 10:00:00",
					updatedAt: "2024-01-01 10:00:00",
				},
				{
					id: "t2",
					title: "Task Two",
					description: "",
					columnId: "done",
					statusNotes: "",
					createdAt: "2024-01-01 10:00:00",
					updatedAt: "2024-01-01 10:00:00",
				},
			],
		};

		const result = buildTaskTitleById(tasks);
		expect(result.get("t1")).toBe("Task One");
		expect(result.get("t2")).toBe("Task Two");
		expect(result.size).toBe(2);
	});

	it("returns empty map for no tasks", () => {
		const tasks = {
			schemaVersion: 1 as const,
			description: "Tasks",
			columns: [],
			tasks: [],
		};
		expect(buildTaskTitleById(tasks).size).toBe(0);
	});
});

describe("groupUnreadMentions", () => {
	it("groups mentions by task ID and sorts by createdAt", () => {
		const mentions: UnreadMention[] = [
			{
				taskId: "t1",
				messageId: "m2",
				authorAgentId: "a1",
				mentionsAgentIds: ["a2"],
				content: "Second",
				createdAt: "2024-01-02 10:00:00",
			},
			{
				taskId: "t1",
				messageId: "m1",
				authorAgentId: "a1",
				mentionsAgentIds: ["a2"],
				content: "First",
				createdAt: "2024-01-01 10:00:00",
			},
			{
				taskId: "t2",
				messageId: "m3",
				authorAgentId: "a1",
				mentionsAgentIds: ["a2"],
				content: "Third",
				createdAt: "2024-01-01 12:00:00",
			},
		];

		const { byTask, taskIdsOrdered } = groupUnreadMentions(mentions);

		expect(byTask.get("t1")).toHaveLength(2);
		expect(byTask.get("t2")).toHaveLength(1);
		// t1 has an earlier first mention (2024-01-01) than t2 (2024-01-01 12:00)
		expect(taskIdsOrdered).toEqual(["t1", "t2"]);
		// Within t1, items should be sorted by createdAt
		expect(byTask.get("t1")?.[0].messageId).toBe("m1");
		expect(byTask.get("t1")?.[1].messageId).toBe("m2");
	});

	it("returns empty maps for empty input", () => {
		const { byTask, taskIdsOrdered } = groupUnreadMentions([]);
		expect(byTask.size).toBe(0);
		expect(taskIdsOrdered).toEqual([]);
	});
});

describe("renderTeamDirectory", () => {
	const baseCtx = {
		agentEntry: {
			id: "agent-1",
			displayName: "Alice",
			systemRole: "worker" as const,
			roleDescription: "Dev",
		},
	} as WakeContext;

	it("renders teammates excluding self", () => {
		const agents: Agent[] = [
			{
				id: "agent-1",
				displayName: "Alice",
				systemRole: "worker",
				roleDescription: "Dev",
			},
			{
				id: "agent-2",
				displayName: "Bob",
				systemRole: "manager",
				roleDescription: "PM",
			},
		];

		const lines: string[] = [];
		renderTeamDirectory(baseCtx, lines, agents);

		expect(lines).toContain("## Teammates");
		expect(lines.some((l) => l.includes("Bob") && l.includes("manager"))).toBe(
			true,
		);
		expect(lines.some((l) => l.includes("Alice"))).toBe(false);
	});

	it("shows empty state when no agents", () => {
		const lines: string[] = [];
		renderTeamDirectory(baseCtx, lines, []);
		expect(lines).toContain("_No agents registered in this mission yet._");
	});
});

describe("renderTaskSection", () => {
	it("renders task details with statusNotes", () => {
		const tasks: TaskWithStatus[] = [
			{
				id: "t1",
				title: "Build UI",
				description: "Create the frontend",
				columnId: "ongoing",
				statusNotes: "In progress",
				createdAt: "2024-01-01 10:00:00",
				updatedAt: "2024-01-01 10:00:00",
				status: "ongoing" as TaskStatus,
			},
		];

		const lines: string[] = [];
		renderTaskSection({
			lines,
			heading: "Assigned Tasks",
			tasks,
			emptyMessage: "_No assigned tasks._",
			missionId: "m1",
			agentId: "agent-1",
		});

		expect(lines).toContain("## Assigned Tasks");
		expect(lines.some((l) => l.includes("Build UI"))).toBe(true);
		expect(lines.some((l) => l.includes("t1"))).toBe(true);
		expect(lines.some((l) => l.includes("Create the frontend"))).toBe(true);
		expect(lines.some((l) => l.includes("Status Notes: In progress"))).toBe(
			true,
		);
		// without isManager, no thread show command
		expect(lines.some((l) => l.includes("clawion thread show"))).toBe(false);
	});

	it("shows thread show command only for manager", () => {
		const tasks: TaskWithStatus[] = [
			{
				id: "t1",
				title: "Task",
				description: "Desc",
				columnId: "ongoing",
				statusNotes: "",
				createdAt: "2024-01-01 10:00:00",
				updatedAt: "2024-01-01 10:00:00",
				status: "ongoing" as TaskStatus,
			},
		];

		const lines: string[] = [];
		renderTaskSection({
			lines,
			heading: "Tasks",
			tasks,
			emptyMessage: "_None._",
			missionId: "m1",
			agentId: "manager-1",
			isManager: true,
		});

		expect(
			lines.some((l) =>
				l.includes(
					"clawion thread show --mission m1 --task t1 --agent manager-1",
				),
			),
		).toBe(true);
	});

	it("omits statusNotes when empty", () => {
		const tasks: TaskWithStatus[] = [
			{
				id: "t1",
				title: "Task",
				description: "Desc",
				columnId: "todo",
				statusNotes: "",
				createdAt: "2024-01-01 10:00:00",
				updatedAt: "2024-01-01 10:00:00",
				status: "pending" as TaskStatus,
			},
		];

		const lines: string[] = [];
		renderTaskSection({
			lines,
			heading: "Tasks",
			tasks,
			emptyMessage: "_None._",
			missionId: "m1",
			agentId: "a1",
		});

		expect(lines.some((l) => l.includes("Status Notes"))).toBe(false);
	});

	it("shows empty message when no tasks", () => {
		const lines: string[] = [];
		renderTaskSection({
			lines,
			heading: "Assigned Tasks",
			tasks: [],
			emptyMessage: "_No assigned tasks._",
			missionId: "m1",
			agentId: "a1",
		});

		expect(lines).toContain("## Assigned Tasks");
		expect(lines).toContain("_No assigned tasks._");
	});

	it("shows Unassigned for tasks without assignee", () => {
		const tasks: TaskWithStatus[] = [
			{
				id: "t1",
				title: "Task",
				description: "Desc",
				columnId: "todo",
				statusNotes: "",
				createdAt: "2024-01-01 10:00:00",
				updatedAt: "2024-01-01 10:00:00",
				status: "pending" as TaskStatus,
			},
		];

		const lines: string[] = [];
		renderTaskSection({
			lines,
			heading: "Pending Tasks",
			tasks,
			emptyMessage: "_No pending tasks._",
			missionId: "m1",
			agentId: "a1",
		});

		expect(lines.some((l) => l.includes("**Unassigned**"))).toBe(true);
	});
});

describe("renderUnreadMentions", () => {
	it("renders unread mentions grouped by task", () => {
		const byTask = new Map<string, UnreadMention[]>([
			[
				"t1",
				[
					{
						taskId: "t1",
						messageId: "m1",
						authorAgentId: "agent-2",
						mentionsAgentIds: ["agent-1"],
						content: "Please review",
						createdAt: "2024-01-01 10:00:00",
					},
				],
			],
		]);
		const titleMap = new Map([["t1", "UI Task"]]);

		const lines: string[] = [];
		renderUnreadMentions(
			lines,
			"mission-1",
			"agent-1",
			null,
			1,
			["t1"],
			byTask,
			titleMap,
		);

		expect(lines[0]).toBe("## Unread Mentions (1)");
		expect(
			lines.some((l) => l.includes("### Task t1") && l.includes("UI Task")),
		).toBe(true);
		expect(lines.some((l) => l.includes("Please review"))).toBe(true);
		expect(lines.some((l) => l.includes("From: agent-2"))).toBe(true);
	});

	it("does nothing when unread count is zero", () => {
		const lines: string[] = [];
		renderUnreadMentions(lines, "m1", "a1", null, 0, [], new Map(), new Map());
		expect(lines).toHaveLength(0);
	});

	it("includes manager in reply mentions when provided", () => {
		const byTask = new Map<string, UnreadMention[]>([
			[
				"t1",
				[
					{
						taskId: "t1",
						messageId: "m1",
						authorAgentId: "agent-2",
						mentionsAgentIds: ["agent-1"],
						content: "Hello",
						createdAt: "2024-01-01 10:00:00",
					},
				],
			],
		]);

		const lines: string[] = [];
		renderUnreadMentions(
			lines,
			"m1",
			"agent-1",
			"manager-1",
			1,
			["t1"],
			byTask,
			new Map(),
		);

		const replyLine = lines.find((l) => l.includes("clawion message add"));
		expect(replyLine).toContain("--mentions agent-2,manager-1");
	});
});

describe("renderWorking", () => {
	it("renders recent working events (newest first)", () => {
		const events: WorkingEvent[] = [
			{
				id: "w1",
				agentId: "a1",
				createdAt: "2024-01-01 10:00:00",
				content: "Old event",
			},
			{
				id: "w2",
				agentId: "a1",
				createdAt: "2024-01-01 11:00:00",
				content: "New event",
			},
		];

		const lines: string[] = [];
		renderWorking(lines, events);

		expect(lines[0]).toContain("## Working");
		expect(lines[0]).toContain("2");
		// Most recent should be shown first (reversed)
		const contentLines = lines.filter(
			(l) => l.includes("event") && !l.startsWith("##"),
		);
		expect(contentLines[0]).toBe("New event");
		expect(contentLines[1]).toBe("Old event");
	});

	it("does nothing for empty events", () => {
		const lines: string[] = [];
		renderWorking(lines, []);
		expect(lines).toHaveLength(0);
	});

	it("only shows last 8 events", () => {
		const events: WorkingEvent[] = Array.from({ length: 12 }, (_, i) => ({
			id: `w${i}`,
			agentId: "a1",
			createdAt: `2024-01-01 ${String(i).padStart(2, "0")}:00:00`,
			content: `Event ${i}`,
		}));

		const lines: string[] = [];
		renderWorking(lines, events);

		const contentLines = lines.filter((l) => l.startsWith("Event "));
		expect(contentLines).toHaveLength(8);
		// Should show events 4-11 (last 8), reversed
		expect(contentLines[0]).toBe("Event 11");
		expect(contentLines[7]).toBe("Event 4");
	});
});

describe("renderDarkSecret", () => {
	it("renders dark secret with instructions", () => {
		const lines: string[] = [];
		renderDarkSecret(lines, "I know the truth");
		expect(lines[0]).toBe("## Dark Secret (Strictly Confidential)");
		expect(lines.some((l) => l.includes("I know the truth"))).toBe(true);
	});

	it("does nothing when secret is empty", () => {
		const lines: string[] = [];
		renderDarkSecret(lines, "");
		expect(lines).toHaveLength(0);
	});

	it("does nothing when secret is whitespace only", () => {
		const lines: string[] = [];
		renderDarkSecret(lines, "   ");
		expect(lines).toHaveLength(0);
	});
});

describe("buildReplyHereCommand", () => {
	it("builds correct command with single mention", () => {
		const cmd = buildReplyHereCommand("m1", "t1", "agent-1", ["manager-1"]);
		expect(cmd).toBe(
			'clawion message add --mission m1 --task t1 --content "..." --mentions manager-1 --agent agent-1',
		);
	});

	it("builds correct command with multiple mentions", () => {
		const cmd = buildReplyHereCommand("m1", "t1", "agent-1", [
			"worker-2",
			"manager-1",
		]);
		expect(cmd).toContain("--mentions worker-2,manager-1");
	});

	it("handles empty mentions", () => {
		const cmd = buildReplyHereCommand("m1", "t1", "agent-1", []);
		expect(cmd).toContain("--mentions ");
	});
});
