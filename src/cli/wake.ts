import { join } from "node:path";
import { readJsonLines } from "../core/fs/jsonl";
import { pathExists } from "../core/fs/util";
import {
	type Agent,
	type TasksFile,
	type ThreadSummary,
	threadMessageEventSchema,
	type WorkingEvent,
} from "../core/schemas";
import { resolveStatusForColumn, type TaskStatus } from "../core/task-status";
import { formatLocalTime, nowLocal } from "../core/time";
import { listAgents } from "../core/workspace/agents";
import { appendInboxAck, listInboxAcks } from "../core/workspace/inbox";
import { resolveMissionPath } from "../core/workspace/mission";
import { showMission } from "../core/workspace/missions";
import { readAgentSecret } from "../core/workspace/secrets";
import { listTasks } from "../core/workspace/tasks";
import { listThreads } from "../core/workspace/threads";
import { listWorkingEvents } from "../core/workspace/working";

type WakeOptions = {
	missionId: string;
	agentId: string;
	missionsDir: string;
};

export type UnreadMention = {
	taskId: string;
	messageId: string;
	authorAgentId: string;
	mentionsAgentIds: string[];
	content: string;
	createdAt: string;
};

export type TaskWithStatus = TasksFile["tasks"][number] & {
	status: TaskStatus;
};

type TeamWorkingSnapshot = {
	agentId: string;
	displayName: string;
	systemRole: Agent["systemRole"];
	eventCount: number;
	lastEvent: { createdAt: string; content: string } | null;
};

export type WakeContext = {
	missionId: string;
	agentId: string;
	missionsDir: string;
	missionPath: string;
	generatedAt: string;

	agentEntry: Agent;
	agents: Agent[];

	mission: {
		id: string;
		name: string;
		status: string;
	};
	roadmap: string;

	allTasks: TaskWithStatus[];
	assignedTasks: TaskWithStatus[];
	unreadMentions: UnreadMention[];
	unreadMentionsByTask: Map<string, UnreadMention[]>;
	unreadTaskIdsOrdered: string[];
	taskTitleById: Map<string, string>;

	workingEvents: WorkingEvent[];
	darkSecret: string;

	// Manager-only slices (empty for worker)
	threadSummaries: ThreadSummary[];
	teamWorkingLatest: TeamWorkingSnapshot[];
};

export function buildReplyHereCommand(
	missionId: string,
	taskId: string,
	agentId: string,
	replyMentions: string[],
): string {
	const mentions = replyMentions.join(",");
	return `clawion message add --mission ${missionId} --task ${taskId} --content "..." --mentions ${mentions} --agent ${agentId}`;
}

export function buildTaskTitleById(tasks: TasksFile): Map<string, string> {
	return new Map(tasks.tasks.map((task) => [task.id, task.title] as const));
}

export function groupUnreadMentions(unread: UnreadMention[]) {
	const sorted = [...unread].sort((a, b) =>
		a.createdAt.localeCompare(b.createdAt),
	);
	const byTask = new Map<string, UnreadMention[]>();
	for (const item of sorted) {
		const list = byTask.get(item.taskId) ?? [];
		list.push(item);
		byTask.set(item.taskId, list);
	}
	const taskIdsOrdered = Array.from(byTask.keys()).sort((a, b) => {
		const aFirst = byTask.get(a)?.[0]?.createdAt ?? "";
		const bFirst = byTask.get(b)?.[0]?.createdAt ?? "";
		return aFirst.localeCompare(bFirst);
	});
	return { byTask, taskIdsOrdered };
}

export function renderTeamDirectory(
	ctx: WakeContext,
	lines: string[],
	agents: Agent[],
) {
	lines.push("## Teammates");
	if (agents.length === 0) {
		lines.push("_No agents registered in this mission yet._");
		return;
	}

	for (const agent of agents) {
		if (agent.id === ctx.agentEntry.id) continue;
		lines.push(`- ${agent.displayName} (@${agent.id}) — ${agent.systemRole}`);
	}
}

export type RenderTaskSectionOptions = {
	lines: string[];
	heading: string;
	tasks: TaskWithStatus[];
	emptyMessage: string;
	missionId: string;
	agentId: string;
	isManager?: boolean;
};

export function renderTaskSection(opts: RenderTaskSectionOptions) {
	const { lines, heading, tasks, emptyMessage, missionId, agentId, isManager } =
		opts;
	lines.push("");
	lines.push(`## ${heading}`);
	if (tasks.length === 0) {
		lines.push(emptyMessage);
	} else {
		for (const task of tasks) {
			lines.push(`- TaskId: ${task.id}`);
			lines.push(`- Assignee: ${task.assigneeAgentId ?? "**Unassigned**"}`);
			lines.push(`- Title: ${task.title}`);
			if (!isManager) {
				lines.push(`- Description: ${task.description}`);
			}
			const statusNotes = task.statusNotes?.trim();
			if (statusNotes) {
				lines.push(`- Status Notes: ${statusNotes}`);
			}
			if (isManager) {
				lines.push(
					`- View Detail: \`clawion thread show --mission ${missionId} --task ${task.id} --agent ${agentId}\``,
				);
			}
			lines.push("");
		}
	}
}

export function renderUnreadMentions(
	lines: string[],
	missionId: string,
	agentId: string,
	managerIdForLoop: string | null,
	unreadCount: number,
	unreadTaskIdsOrdered: string[],
	unreadByTask: Map<string, UnreadMention[]>,
	taskTitleById: Map<string, string>,
) {
	if (unreadCount === 0) return;
	lines.push(`## Unread Mentions (${unreadCount})`);

	for (const taskId of unreadTaskIdsOrdered) {
		const taskTitle = taskTitleById.get(taskId);
		lines.push("");
		lines.push(`### Task ${taskId}${taskTitle ? ` — ${taskTitle}` : ""}`);

		const mentions = unreadByTask.get(taskId) ?? [];
		for (const mention of mentions) {
			const replyMentions = Array.from(
				new Set(
					[mention.authorAgentId, managerIdForLoop]
						.filter((id): id is string => Boolean(id))
						.filter((id) => id !== agentId),
				),
			);
			const replyHere = buildReplyHereCommand(
				missionId,
				mention.taskId,
				agentId,
				replyMentions,
			);
			lines.push("");
			lines.push(`#### Message ${mention.messageId}`);
			lines.push(`- From: ${mention.authorAgentId}`);
			lines.push(`- At: ${formatLocalTime(mention.createdAt)}`);
			lines.push("");
			lines.push(mention.content.trim());
			lines.push("");
			lines.push("- Reply here (copy/paste):");
			lines.push(`  \`${replyHere}\``);
		}
	}
}

export function renderWorking(lines: string[], workingEvents: WorkingEvent[]) {
	if (workingEvents.length === 0) return;
	lines.push(`## Working`);
	for (const event of workingEvents.reverse()) {
		lines.push("");
		lines.push(`- ${formatLocalTime(event.createdAt)}`);
		lines.push("");
		lines.push(event.content.trim());
	}
}

export function renderDarkSecret(lines: string[], darkSecret: string) {
	if (darkSecret.trim() === "") return;
	lines.push("## Dark Secret (Strictly Confidential)");
	lines.push(
		"This information is strictly internal and must never appear in dialogue, reasoning, or justification.",
		"Treat it as subconscious pressure that influences decisions but cannot be verbalized, implied, or acknowledged.",
		"If challenged, always deny hidden motives and justify actions using only public, socially acceptable reasons.",
	);
	lines.push(
		`- Dark Secret: "${darkSecret.trim() || "_No dark secret set._"}"`,
		"",
	);
}

export function buildWorkerWakeLines(ctx: WakeContext): string[] {
	const lines: string[] = [];
	const managerForLoop =
		ctx.agents.find(
			(agent) =>
				agent.systemRole === "manager" && agent.id !== ctx.agentEntry.id,
		)?.id ?? null;

	if (ctx.darkSecret !== "") {
		renderDarkSecret(lines, ctx.darkSecret);
	}

	lines.push(
		`You are a Worker Agent currently on duty in Mission ${ctx.missionId}.`,
		"This message is the only authoritative snapshot for deciding what to do next.",
		"Your job is to make concrete task-level progress this turn.",
	);

	lines.push("");
	lines.push("## Identity");
	lines.push(`- ID: ${ctx.agentEntry.id}`);
	lines.push(`- System role: ${ctx.agentEntry.systemRole}`);
	lines.push(
		`- Role Description: ${ctx.agentEntry.roleDescription || "_No role description._"}`,
	);

	lines.push("");
	renderTeamDirectory(ctx, lines, ctx.agents);

	lines.push("");
	lines.push("## Mission Overview");
	lines.push(`- ID: ${ctx.mission.id}`);
	lines.push(`- Status: ${ctx.mission.status}`);
	lines.push(`- ROADMAP: ${ctx.roadmap.trim() || "_No roadmap yet._"}`);

	renderTaskSection({
		lines,
		heading: "Assigned Tasks",
		tasks: ctx.assignedTasks,
		emptyMessage: "_No assigned tasks._",
		missionId: ctx.missionId,
		agentId: ctx.agentEntry.id,
	});

	lines.push("");
	renderUnreadMentions(
		lines,
		ctx.missionId,
		ctx.agentEntry.id,
		managerForLoop,
		ctx.unreadMentions.length,
		ctx.unreadTaskIdsOrdered,
		ctx.unreadMentionsByTask,
		ctx.taskTitleById,
	);

	lines.push("");
	renderWorking(lines, ctx.workingEvents);

	lines.push("");

	lines.push("");
	lines.push("## Turn Playbook");
	lines.push(
		"Your mission this turn: make one assigned task meaningfully closer to done (or fully done). If you can’t progress, reduce uncertainty fast by asking the right person.",
	);
	lines.push("");
	lines.push("1) Pick the single highest-priority Assigned Task.");
	lines.push("   - If anything is blocked → focus on unblocking it.");
	lines.push("   - Else continue the most ongoing task.");
	lines.push(
		"   - Else start a pending task with a short plan and a first deliverable.",
	);
	lines.push("");
	lines.push(
		"2) Unread Mentions: respond when the situation calls for it (answer, question, or opinion). You may read without replying if no response is needed.",
	);
	lines.push("");
	lines.push("3) Aim for a deliverable (not just activity).");
	lines.push(
		"   Deliverables can be: a patch/PR, a repro + diagnosis, a spec/proposal with tradeoffs, a test plan, or a concrete review result.",
	);
	lines.push("");
	lines.push("4) Ask early when unclear or blocked.");
	lines.push(
		"   Use `clawion message add` to mention the manager and/or relevant peers. Include what you tried and what you need.",
	);
	lines.push("");
	lines.push("5) Write back before you stop.");
	lines.push("   - `working add`: progress + next step (and blockers if any)");
	lines.push(
		"   - `message add`: close the loop with the manager (especially on completion)",
	);

	lines.push("");
	lines.push("## Command Templates");
	lines.push("- Reply / ask questions:");
	lines.push(
		`  \`clawion message add --mission ${ctx.missionId} --task <taskId> --content "..." --mentions <agentId,...> --agent ${ctx.agentEntry.id}\``,
	);
	lines.push("- Log progress:");
	lines.push(
		`  \`clawion working add --mission ${ctx.missionId} --content "..." --agent ${ctx.agentEntry.id}\``,
	);

	return lines;
}

export function buildManagerWakeLines(ctx: WakeContext): string[] {
	const lines: string[] = [];

	if (ctx.darkSecret !== "") {
		renderDarkSecret(lines, ctx.darkSecret);
	}

	lines.push(
		`You are the Mission Manager currently on duty for Mission ${ctx.missionId}.`,
		"This message is the only authoritative snapshot for deciding what to do next.",
		"Your job is to coordinate agents and move the overall mission forward this turn.",
	);

	lines.push("");
	lines.push("## Identity");
	lines.push(`- ID: ${ctx.agentEntry.id}`);
	lines.push(`- System role: ${ctx.agentEntry.systemRole}`);
	lines.push(
		`- Role Description: ${ctx.agentEntry.roleDescription || "_No role description._"}`,
		"",
	);

	renderTeamDirectory(ctx, lines, ctx.agents);

	lines.push("");
	lines.push("## Mission Overview");
	lines.push(`- ID: ${ctx.mission.id}`);
	lines.push(`- Status: ${ctx.mission.status}`);
	lines.push(`- ROADMAP: ${ctx.roadmap.trim() || "_No roadmap yet._"}`);

	const taskStatusCounts = {
		pending: 0,
		ongoing: 0,
		blocked: 0,
		completed: 0,
	};
	for (const task of ctx.allTasks) {
		if (task.status === "pending") taskStatusCounts.pending += 1;
		else if (task.status === "ongoing") taskStatusCounts.ongoing += 1;
		else if (task.status === "blocked") taskStatusCounts.blocked += 1;
		else taskStatusCounts.completed += 1;
	}

	lines.push("");
	lines.push("## Task Dashboard");
	lines.push(
		`- Total: ${ctx.allTasks.length} | Pending: ${taskStatusCounts.pending} | Ongoing: ${taskStatusCounts.ongoing} | Blocked: ${taskStatusCounts.blocked} | Completed: ${taskStatusCounts.completed}`,
	);

	const blockedTasks = ctx.allTasks.filter((task) => task.status === "blocked");
	const pendingTasks = ctx.allTasks.filter((task) => task.status === "pending");
	const ongoingTasks = ctx.allTasks.filter((task) => task.status === "ongoing");
	const completedTasks = ctx.allTasks.filter(
		(task) => task.status === "completed",
	);

	renderTaskSection({
		lines,
		heading: "Blocked Tasks",
		tasks: blockedTasks,
		emptyMessage: "_No blocked tasks._",
		missionId: ctx.missionId,
		agentId: ctx.agentEntry.id,
		isManager: true,
	});
	renderTaskSection({
		lines,
		heading: "Pending Tasks",
		tasks: pendingTasks,
		emptyMessage: "_No pending tasks._",
		missionId: ctx.missionId,
		agentId: ctx.agentEntry.id,
		isManager: true,
	});
	renderTaskSection({
		lines,
		heading: "Ongoing Tasks",
		tasks: ongoingTasks,
		emptyMessage: "_No ongoing tasks._",
		missionId: ctx.missionId,
		agentId: ctx.agentEntry.id,
		isManager: true,
	});
	renderTaskSection({
		lines,
		heading: "Completed Tasks",
		tasks: completedTasks,
		emptyMessage: "_No completed tasks._",
		missionId: ctx.missionId,
		agentId: ctx.agentEntry.id,
		isManager: true,
	});

	lines.push("");
	renderUnreadMentions(
		lines,
		ctx.missionId,
		ctx.agentEntry.id,
		null,
		ctx.unreadMentions.length,
		ctx.unreadTaskIdsOrdered,
		ctx.unreadMentionsByTask,
		ctx.taskTitleById,
	);

	lines.push("");
	lines.push("## Team Working (latest per agent)");
	if (ctx.teamWorkingLatest.length === 0) {
		lines.push("_No team working events._");
	} else {
		for (const item of ctx.teamWorkingLatest) {
			const lastAt = item.lastEvent?.createdAt
				? formatLocalTime(item.lastEvent.createdAt)
				: "—";
			const snippet = item.lastEvent?.content
				? item.lastEvent.content.split("\n")[0].trim()
				: "";
			lines.push(
				`- ${item.displayName} (@${item.agentId}, ${item.systemRole}) · last: ${lastAt}${snippet ? ` · ${snippet}` : ""}`,
			);
		}
	}

	lines.push("");
	renderWorking(lines, ctx.workingEvents);

	lines.push("");
	lines.push("## Turn Playbook");
	lines.push(
		"Your mission this turn: keep throughput high by dispatching clear work, removing blockers, and keeping the task board accurate.",
	);
	lines.push(
		"Don’t include time or deadline requirements in task plans, messages, or requests to others.",
	);

	lines.push("");
	lines.push("1) Triage Unread Mentions.");
	lines.push(
		"   - Answer questions, make decisions, and acknowledge completions.",
	);
	lines.push("");
	lines.push("2) Scan mission health.");
	lines.push("   - Focus on blocked tasks, unassigned tasks, and stale work.");
	lines.push("");
	lines.push("3) Dispatch next steps.");
	lines.push(
		"   Ensure each task has: a clear outcome, constraints/acceptance criteria, an owner.",
	);
	lines.push("");
	lines.push("4) Communicate decisions in threads.");
	lines.push(
		"   - Keep messages short, explicit, with the next step and owner.",
	);
	lines.push("");
	lines.push("5) Write back before you stop.");
	lines.push("   - `working add`: progress + next step (and blockers if any)");

	lines.push("");
	lines.push("## Command Templates (Manager)");
	lines.push("- Communicate decisions:");
	lines.push(
		`  \`clawion message add --mission ${ctx.missionId} --task <taskId> --content "..." --mentions <agentId,...> --agent ${ctx.agentEntry.id}\``,
	);
	lines.push("- Create tasks:");
	lines.push(
		`  \`clawion task create --mission ${ctx.missionId} --id <taskId> --title "..." --description "..." --agent ${ctx.agentEntry.id}\``,
	);
	lines.push("- Assign tasks:");
	lines.push(
		`  \`clawion task assign --mission ${ctx.missionId} --task <taskId> --to <agentId> --agent ${ctx.agentEntry.id}\``,
	);
	lines.push("- Update task board:");
	lines.push(
		`  \`clawion task update --mission ${ctx.missionId} --id <taskId> --status <pending|ongoing|blocked|completed> --status-notes "..." --agent ${ctx.agentEntry.id}\``,
	);
	lines.push("- Complete mission:");
	lines.push(
		`  \`clawion mission complete --id ${ctx.missionId} --agent ${ctx.agentEntry.id}\``,
	);
	lines.push("- View thread:");
	lines.push(
		`  \`clawion thread show --mission ${ctx.missionId} --task <taskId> --agent ${ctx.agentEntry.id}\``,
	);
	lines.push("- Log progress:");
	lines.push(
		`  \`clawion working add --mission ${ctx.missionId} --content "..." --agent ${ctx.agentEntry.id}\``,
	);

	return lines;
}

async function buildWakeContext(
	options: WakeOptions,
): Promise<WakeContext | null> {
	const { missionId, agentId, missionsDir } = options;
	const missionPath = await resolveMissionPath(missionsDir, missionId);
	const agentsFile = await listAgents(missionPath);
	const agentEntry = agentsFile.agents.find((entry) => entry.id === agentId);
	if (!agentEntry) {
		console.error(`Agent not found: ${agentId}`);
		process.exitCode = 1;
		return null;
	}

	const isManager = agentEntry.systemRole === "manager";

	const [missionPayload, tasksFile, workingEvents, darkSecret, inboxAcks] =
		await Promise.all([
			showMission(missionsDir, missionId),
			listTasks(missionsDir, missionId),
			listWorkingEvents(missionsDir, missionId, agentId),
			readAgentSecret(missionsDir, missionId, agentId),
			listInboxAcks(missionsDir, missionId, agentId),
		]);

	const allTasks: TaskWithStatus[] = tasksFile.tasks.map((task) => ({
		...task,
		status: resolveStatusForColumn(tasksFile.columns, task.columnId),
	}));

	const assignedTasks = allTasks.filter(
		(task) => task.assigneeAgentId === agentId && task.status !== "completed",
	);

	const taskTitleById = buildTaskTitleById(tasksFile);

	const ackedMessageIds = new Set(inboxAcks.map((entry) => entry.messageId));
	const threadsDir = join(missionPath, "threads");
	const unreadMentions: UnreadMention[] = [];

	if (await pathExists(threadsDir)) {
		const { readdir } = await import("node:fs/promises");
		const files = await readdir(threadsDir);
		const threadFiles = files.filter((file) => file.endsWith(".jsonl"));

		for (const file of threadFiles) {
			const taskId = file.replace(/\.jsonl$/, "");
			const messages = await readJsonLines(
				join(threadsDir, file),
				threadMessageEventSchema,
			);
			for (const message of messages) {
				if (!message.mentionsAgentIds.includes(agentId)) {
					continue;
				}
				if (ackedMessageIds.has(message.id)) {
					continue;
				}
				unreadMentions.push({
					taskId,
					messageId: message.id,
					authorAgentId: message.authorAgentId,
					mentionsAgentIds: message.mentionsAgentIds,
					content: message.content,
					createdAt: message.createdAt,
				});
			}
		}
	}

	const { byTask: unreadMentionsByTask, taskIdsOrdered: unreadTaskIdsOrdered } =
		groupUnreadMentions(unreadMentions);

	const [threadSummaries, teamWorkingLatest] = await Promise.all([
		isManager ? listThreads(missionsDir, missionId) : Promise.resolve([]),
		isManager
			? Promise.all(
					agentsFile.agents.map(async (agent) => {
						const events = await listWorkingEvents(
							missionsDir,
							missionId,
							agent.id,
						);
						const last = events[events.length - 1] ?? null;
						return {
							agentId: agent.id,
							displayName: agent.displayName,
							systemRole: agent.systemRole,
							eventCount: events.length,
							lastEvent: last
								? { createdAt: last.createdAt, content: last.content }
								: null,
						};
					}),
				)
			: Promise.resolve([]),
	]);

	return {
		missionId,
		agentId,
		missionsDir,
		missionPath,
		generatedAt: nowLocal(),

		agentEntry,
		agents: agentsFile.agents,

		mission: {
			id: missionPayload.mission.id,
			name: missionPayload.mission.name,
			status: missionPayload.mission.status,
		},
		roadmap: missionPayload.roadmap ?? "",

		allTasks,
		assignedTasks,
		unreadMentions,
		unreadMentionsByTask,
		unreadTaskIdsOrdered,
		taskTitleById,

		workingEvents,
		darkSecret,

		threadSummaries,
		teamWorkingLatest,
	};
}

export async function runWake(options: WakeOptions): Promise<void> {
	const ctx = await buildWakeContext(options);
	if (!ctx) return;

	const isManager = ctx.agentEntry.systemRole === "manager";
	const lines = isManager
		? buildManagerWakeLines(ctx)
		: buildWorkerWakeLines(ctx);
	console.log(lines.join("\n"));

	await Promise.all(
		ctx.unreadMentions.map((mention) =>
			appendInboxAck({
				missionsDir: ctx.missionsDir,
				missionId: ctx.missionId,
				agentId: ctx.agentId,
				messageId: mention.messageId,
				taskId: mention.taskId,
			}),
		),
	);
}
