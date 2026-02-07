import { describe, expect, it } from "vitest";
import {
	buildManagerWakeLines,
	buildWorkerWakeLines,
	type WakeContext,
} from "../src/cli/wake";
import type { Agent } from "../src/core/schemas";
import type { TaskStatus } from "../src/core/task-status";

function makeAgent(overrides?: Partial<Agent>): Agent {
	return {
		id: "agent-1",
		displayName: "Alice",
		systemRole: "worker",
		roleDescription: "Frontend dev",
		...overrides,
	};
}

function makeManagerAgent(overrides?: Partial<Agent>): Agent {
	return {
		id: "manager-1",
		displayName: "Manager",
		systemRole: "manager",
		roleDescription: "Project manager",
		...overrides,
	};
}

function makeBaseContext(overrides?: Partial<WakeContext>): WakeContext {
	return {
		missionId: "m1",
		agentId: "agent-1",
		missionsDir: "/tmp/missions",
		missionPath: "/tmp/missions/m1",
		generatedAt: "2024-01-01 10:00:00",
		agentEntry: makeAgent(),
		agents: [makeAgent(), makeManagerAgent()],
		mission: { id: "m1", name: "Test Mission", status: "active" },
		roadmap: "# Roadmap\nStep 1",
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
		...overrides,
	};
}

describe("buildWorkerWakeLines", () => {
	it("includes worker identity and mission overview", () => {
		const ctx = makeBaseContext();
		const lines = buildWorkerWakeLines(ctx);
		const text = lines.join("\n");

		expect(text).toContain("Worker Agent");
		expect(text).toContain("agent-1");
		expect(text).toContain("## Identity");
		expect(text).toContain("## Mission Overview");
		expect(text).toContain("- ID: m1");
		expect(text).toContain("# Roadmap");
	});

	it("includes role description", () => {
		const ctx = makeBaseContext();
		const lines = buildWorkerWakeLines(ctx);
		const text = lines.join("\n");

		expect(text).toContain("Frontend dev");
	});

	it("shows empty roadmap placeholder when no roadmap", () => {
		const ctx = makeBaseContext({ roadmap: "" });
		const lines = buildWorkerWakeLines(ctx);
		const text = lines.join("\n");

		expect(text).toContain("_No roadmap yet._");
	});

	it("includes teammates excluding self", () => {
		const ctx = makeBaseContext();
		const lines = buildWorkerWakeLines(ctx);
		const text = lines.join("\n");

		expect(text).toContain("## Teammates");
		expect(text).toContain("Manager (@manager-1)");
		expect(text).not.toContain("Alice (@agent-1)");
	});

	it("renders assigned tasks", () => {
		const ctx = makeBaseContext({
			assignedTasks: [
				{
					id: "t1",
					title: "Build Login",
					description: "Implement login flow",
					columnId: "ongoing",
					statusNotes: "WIP",
					createdAt: "2024-01-01 10:00:00",
					updatedAt: "2024-01-01 10:00:00",
					status: "ongoing" as TaskStatus,
				},
			],
		});
		const lines = buildWorkerWakeLines(ctx);
		const text = lines.join("\n");

		expect(text).toContain("## Assigned Tasks");
		expect(text).toContain("- TaskId: t1");
		expect(text).toContain("- Title: Build Login");
		expect(text).toContain("- Description: Implement login flow");
		expect(text).toContain("- Status Notes: WIP");
		// worker should NOT see thread show command
		expect(text).not.toContain("clawion thread show");
	});

	it("renders unread mentions with reply command", () => {
		const unreadMentions = [
			{
				taskId: "t1",
				messageId: "msg-1",
				authorAgentId: "manager-1",
				mentionsAgentIds: ["agent-1"],
				content: "Please review the PR",
				createdAt: "2024-01-01 12:00:00",
			},
		];
		const ctx = makeBaseContext({
			unreadMentions,
			unreadMentionsByTask: new Map([["t1", unreadMentions]]),
			unreadTaskIdsOrdered: ["t1"],
			taskTitleById: new Map([["t1", "Build Login"]]),
		});
		const lines = buildWorkerWakeLines(ctx);
		const text = lines.join("\n");

		expect(text).toContain("## Unread Mentions (1)");
		expect(text).toContain("Please review the PR");
		expect(text).toContain("clawion message add");
	});

	it("renders dark secret when present", () => {
		const ctx = makeBaseContext({ darkSecret: "Hidden motive" });
		const lines = buildWorkerWakeLines(ctx);
		const text = lines.join("\n");

		expect(text).toContain("## Dark Secret");
		expect(text).toContain("Hidden motive");
	});

	it("renders working events", () => {
		const ctx = makeBaseContext({
			workingEvents: [
				{
					id: "w1",
					agentId: "agent-1",
					createdAt: "2024-01-01 10:00:00",
					content: "Investigating bug",
				},
			],
		});
		const lines = buildWorkerWakeLines(ctx);
		const text = lines.join("\n");

		expect(text).toContain("## Working");
		expect(text).toContain("Investigating bug");
	});

	it("includes turn playbook and command templates", () => {
		const ctx = makeBaseContext();
		const lines = buildWorkerWakeLines(ctx);
		const text = lines.join("\n");

		expect(text).toContain("## Turn Playbook");
		expect(text).toContain("## Command Templates");
		expect(text).toContain("clawion message add");
		expect(text).toContain("clawion working add");
	});

	it("uses empty role description placeholder", () => {
		const ctx = makeBaseContext({
			agentEntry: makeAgent({ roleDescription: "" }),
		});
		const lines = buildWorkerWakeLines(ctx);
		const text = lines.join("\n");

		expect(text).toContain("_No role description._");
	});
});

describe("buildManagerWakeLines", () => {
	it("includes manager identity and mission overview", () => {
		const ctx = makeBaseContext({
			agentEntry: makeManagerAgent(),
			agentId: "manager-1",
		});
		const lines = buildManagerWakeLines(ctx);
		const text = lines.join("\n");

		expect(text).toContain("Mission Manager");
		expect(text).toContain("manager-1");
		expect(text).toContain("## Identity");
		expect(text).toContain("## Mission Overview");
	});

	it("includes mission dashboard with task status counts", () => {
		const ctx = makeBaseContext({
			agentEntry: makeManagerAgent(),
			agentId: "manager-1",
			allTasks: [
				{
					id: "t1",
					title: "T1",
					description: "",
					columnId: "todo",
					statusNotes: "",
					createdAt: "",
					updatedAt: "",
					status: "pending" as TaskStatus,
				},
				{
					id: "t2",
					title: "T2",
					description: "",
					columnId: "ongoing",
					statusNotes: "",
					createdAt: "",
					updatedAt: "",
					status: "ongoing" as TaskStatus,
				},
				{
					id: "t3",
					title: "T3",
					description: "",
					columnId: "blocked",
					statusNotes: "blocked: waiting",
					assigneeAgentId: "agent-1",
					createdAt: "",
					updatedAt: "",
					status: "blocked" as TaskStatus,
				},
				{
					id: "t4",
					title: "T4",
					description: "",
					columnId: "done",
					statusNotes: "",
					createdAt: "",
					updatedAt: "",
					status: "completed" as TaskStatus,
				},
			],
		});
		const lines = buildManagerWakeLines(ctx);
		const text = lines.join("\n");

		expect(text).toContain("## Mission Overview");
		expect(text).toContain("## Task Dashboard");
		expect(text).toContain(
			"Total: 4 | Pending: 1 | Ongoing: 1 | Blocked: 1 | Completed: 1",
		);
		expect(text).toContain("## Blocked Tasks");
		expect(text).toContain("## Pending Tasks");
		expect(text).toContain("## Ongoing Tasks");
	});

	it("lists blocked tasks with assignee and notes", () => {
		const ctx = makeBaseContext({
			agentEntry: makeManagerAgent(),
			agentId: "manager-1",
			allTasks: [
				{
					id: "t1",
					title: "Blocked Task",
					description: "Can't proceed",
					columnId: "blocked",
					statusNotes: "Waiting for API",
					assigneeAgentId: "agent-1",
					createdAt: "",
					updatedAt: "",
					status: "blocked" as TaskStatus,
				},
			],
		});
		const lines = buildManagerWakeLines(ctx);
		const text = lines.join("\n");

		expect(text).toContain("## Blocked Tasks");
		expect(text).toContain("- TaskId: t1");
		expect(text).toContain("- Assignee: agent-1");
		expect(text).toContain("- Title: Blocked Task");
		expect(text).toContain("- Status Notes: Waiting for API");
		expect(text).toContain("clawion thread show --mission m1 --task t1");
	});

	it("shows empty state for blocked tasks", () => {
		const ctx = makeBaseContext({
			agentEntry: makeManagerAgent(),
			agentId: "manager-1",
		});
		const lines = buildManagerWakeLines(ctx);
		const text = lines.join("\n");

		expect(text).toContain("_No blocked tasks._");
	});

	it("lists pending tasks", () => {
		const ctx = makeBaseContext({
			agentEntry: makeManagerAgent(),
			agentId: "manager-1",
			allTasks: [
				{
					id: "t1",
					title: "Pending Task",
					description: "Waiting to start",
					columnId: "todo",
					statusNotes: "",
					assigneeAgentId: "agent-1",
					createdAt: "",
					updatedAt: "",
					status: "pending" as TaskStatus,
				},
			],
		});
		const lines = buildManagerWakeLines(ctx);
		const text = lines.join("\n");

		expect(text).toContain("## Pending Tasks");
		expect(text).toContain("Pending Task");
		expect(text).toContain("Waiting to start");
	});

	it("shows empty state for pending tasks", () => {
		const ctx = makeBaseContext({
			agentEntry: makeManagerAgent(),
			agentId: "manager-1",
		});
		const lines = buildManagerWakeLines(ctx);
		const text = lines.join("\n");

		expect(text).toContain("_No pending tasks._");
	});

	it("lists ongoing tasks", () => {
		const ctx = makeBaseContext({
			agentEntry: makeManagerAgent(),
			agentId: "manager-1",
			allTasks: [
				{
					id: "t1",
					title: "Ongoing Task",
					description: "In progress now",
					columnId: "doing",
					statusNotes: "",
					assigneeAgentId: "agent-1",
					createdAt: "",
					updatedAt: "",
					status: "ongoing" as TaskStatus,
				},
			],
		});
		const lines = buildManagerWakeLines(ctx);
		const text = lines.join("\n");

		expect(text).toContain("## Ongoing Tasks");
		expect(text).toContain("Ongoing Task");
		expect(text).toContain("In progress now");
	});

	it("shows empty state for ongoing tasks", () => {
		const ctx = makeBaseContext({
			agentEntry: makeManagerAgent(),
			agentId: "manager-1",
		});
		const lines = buildManagerWakeLines(ctx);
		const text = lines.join("\n");

		expect(text).toContain("_No ongoing tasks._");
	});

	it("shows team working (latest per agent)", () => {
		const ctx = makeBaseContext({
			agentEntry: makeManagerAgent(),
			agentId: "manager-1",
			teamWorkingLatest: [
				{
					agentId: "agent-1",
					displayName: "Alice",
					systemRole: "worker",
					eventCount: 3,
					lastEvent: {
						createdAt: "2024-01-15 10:00:00",
						content: "Fixing tests",
					},
				},
			],
		});
		const lines = buildManagerWakeLines(ctx);
		const text = lines.join("\n");

		expect(text).toContain("## Team Working");
		expect(text).toContain("Alice (@agent-1, worker)");
		expect(text).toContain("Fixing tests");
	});

	it("shows empty team working", () => {
		const ctx = makeBaseContext({
			agentEntry: makeManagerAgent(),
			agentId: "manager-1",
		});
		const lines = buildManagerWakeLines(ctx);
		const text = lines.join("\n");

		expect(text).toContain("_No team working events._");
	});

	it("renders thread activity from threadSummaries", () => {
		const ctx = makeBaseContext({
			agentEntry: makeManagerAgent(),
			agentId: "manager-1",
			threadSummaries: [
				{
					taskId: "t1",
					messageCount: 3,
					lastMessageAt: "2024-01-15 10:00:00",
					lastAuthorAgentId: "agent-1",
					lastMentionsAgentIds: ["manager-1"],
				},
			],
			taskTitleById: new Map([["t1", "Build Login"]]),
		});
		const lines = buildManagerWakeLines(ctx);
		const text = lines.join("\n");

		expect(text).toContain("## Thread Activity");
		expect(text).toContain("Task t1 (Build Login)");
		expect(text).toContain("3 messages");
		expect(text).toContain("@agent-1");
	});

	it("shows empty thread activity", () => {
		const ctx = makeBaseContext({
			agentEntry: makeManagerAgent(),
			agentId: "manager-1",
		});
		const lines = buildManagerWakeLines(ctx);
		const text = lines.join("\n");

		expect(text).toContain("## Thread Activity");
		expect(text).toContain("_No threads yet._");
	});

	it("includes manager command templates", () => {
		const ctx = makeBaseContext({
			agentEntry: makeManagerAgent(),
			agentId: "manager-1",
		});
		const lines = buildManagerWakeLines(ctx);
		const text = lines.join("\n");

		expect(text).toContain("## Command Templates (Manager)");
		expect(text).toContain("clawion task create");
		expect(text).toContain("clawion task assign");
		expect(text).toContain("clawion task update");
		expect(text).toContain("clawion mission roadmap");
		expect(text).toContain("clawion mission complete");
		expect(text).toContain("clawion thread show");
	});

	it("includes manager turn playbook", () => {
		const ctx = makeBaseContext({
			agentEntry: makeManagerAgent(),
			agentId: "manager-1",
		});
		const lines = buildManagerWakeLines(ctx);
		const text = lines.join("\n");

		expect(text).toContain("## Turn Playbook");
		expect(text).toContain("Triage Unread Mentions");
		expect(text).toContain("Scan mission health");
	});

	it("handles team working with no last event", () => {
		const ctx = makeBaseContext({
			agentEntry: makeManagerAgent(),
			agentId: "manager-1",
			teamWorkingLatest: [
				{
					agentId: "agent-1",
					displayName: "Alice",
					systemRole: "worker",
					eventCount: 0,
					lastEvent: null,
				},
			],
		});
		const lines = buildManagerWakeLines(ctx);
		const text = lines.join("\n");

		expect(text).toContain("Alice (@agent-1, worker)");
		// Should show — for no lastEvent
		expect(text).toContain("last: —");
	});
});

describe("runWake integration", () => {
	it("is exported and callable", async () => {
		const { runWake } = await import("../src/cli/wake");
		expect(typeof runWake).toBe("function");
	});
});
