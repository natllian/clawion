import { join } from "node:path";
import { readJsonLines } from "../core/fs/jsonl";
import { pathExists } from "../core/fs/util";
import { threadMessageEventSchema } from "../core/schemas";
import { resolveStatusForColumn } from "../core/task-status";
import { listAgents } from "../core/workspace/agents";
import { appendInboxAck, listInboxAcks } from "../core/workspace/inbox";
import { readMemory } from "../core/workspace/memory";
import { resolveMissionPath } from "../core/workspace/mission";
import { showMission } from "../core/workspace/missions";
import { listTasks } from "../core/workspace/tasks";
import { listWorkingEvents } from "../core/workspace/working";

type WakeOptions = {
	missionId: string;
	agentId: string;
	missionsDir: string;
};

type UnreadMention = {
	taskId: string;
	messageId: string;
	authorAgentId: string;
	mentionsAgentIds: string[];
	content: string;
	createdAt: string;
};

export async function runWake(options: WakeOptions): Promise<void> {
	const { missionId, agentId, missionsDir } = options;

	try {
		const missionPath = await resolveMissionPath(missionsDir, missionId);
		const agentsFile = await listAgents(missionPath);
		const agentEntry = agentsFile.agents.find((entry) => entry.id === agentId);
		if (!agentEntry) {
			console.error(`Agent not found: ${agentId}`);
			process.exitCode = 1;
			return;
		}

		const [missionPayload, tasksFile, workingEvents, memory, inboxAcks] =
			await Promise.all([
				showMission(missionsDir, missionId),
				listTasks(missionsDir, missionId),
				listWorkingEvents(missionsDir, missionId, agentId),
				readMemory(missionsDir, missionId, agentId),
				listInboxAcks(missionsDir, missionId, agentId),
			]);

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

		const assignedTasks = tasksFile.tasks
			.map((task) => ({
				...task,
				status: resolveStatusForColumn(tasksFile.columns, task.columnId),
			}))
			.filter(
				(task) =>
					task.assigneeAgentId === agentId && task.status !== "completed",
			);

		const taskTitleById = new Map(
			tasksFile.tasks.map((task) => [task.id, task.title] as const),
		);

		const unreadMentionsSorted = [...unreadMentions].sort((a, b) =>
			a.createdAt.localeCompare(b.createdAt),
		);

		const unreadMentionsByTask = new Map<string, UnreadMention[]>();
		for (const mention of unreadMentionsSorted) {
			const list = unreadMentionsByTask.get(mention.taskId) ?? [];
			list.push(mention);
			unreadMentionsByTask.set(mention.taskId, list);
		}

		const unreadTaskIdsOrdered = Array.from(unreadMentionsByTask.keys()).sort(
			(a, b) => {
				const aFirst = unreadMentionsByTask.get(a)?.[0]?.createdAt ?? "";
				const bFirst = unreadMentionsByTask.get(b)?.[0]?.createdAt ?? "";
				return aFirst.localeCompare(bFirst);
			},
		);

		const generatedAt = new Date().toISOString();
		const lines: string[] = [];

		lines.push(
			`# Wake: ${agentEntry.displayName} (${agentEntry.id}) · Mission ${missionId}`,
		);
		lines.push("");
		lines.push(
			`SYSTEM: You are Agent ${agentId} working on Mission ${missionId}. This Wake report is your single source of truth for this turn, assembled from the mission workspace state below (ROADMAP, tasks, threads, inbox acks, working log, and memory).`,
		);
		lines.push(
			`SYSTEM: Read top-to-bottom, then act: respond to Unread Mentions, work Assigned Tasks, and record outcomes via \`clawion message add\`, \`clawion working add\`, and \`clawion memory set\`. Messages shown as unread will be auto-acknowledged after this Wake.`,
		);
		lines.push("");
		lines.push(`Generated at: ${generatedAt}`);
		lines.push("");
		lines.push("## Agent");
		lines.push(`- ID: ${agentEntry.id}`);
		lines.push(`- Display name: ${agentEntry.displayName}`);
		lines.push(`- System role: ${agentEntry.systemRole}`);
		lines.push(`- Status: ${agentEntry.status}`);
		lines.push("");
		lines.push("### Role Description");
		lines.push(agentEntry.roleDescription || "_No role description._");
		lines.push("");
		lines.push("## Mission Overview");
		lines.push(`- ID: ${missionPayload.mission.id}`);
		lines.push(`- Name: ${missionPayload.mission.name}`);
		lines.push(`- Status: ${missionPayload.mission.status}`);
		lines.push(`- Description: ${missionPayload.mission.description}`);
		lines.push("");
		lines.push("### ROADMAP");
		lines.push(missionPayload.roadmap?.trim() || "_No roadmap yet._");
		lines.push("");
		lines.push("## Assigned Tasks");
		if (assignedTasks.length === 0) {
			lines.push("_No assigned tasks._");
		} else {
			for (const task of assignedTasks) {
				const statusNotes = task.statusNotes?.trim();
				lines.push(
					`- ${task.title} (#${task.id}) — ${task.status}${
						statusNotes ? ` — ${statusNotes}` : ""
					}`,
				);
			}
		}
		lines.push("");
		lines.push(`## Unread Mentions (${unreadMentions.length})`);
		lines.push(
			"_All unread mentions shown below will be automatically acknowledged after this Wake._",
		);
		if (unreadMentions.length === 0) {
			lines.push("");
			lines.push("_No unread mentions._");
		} else {
			for (const taskId of unreadTaskIdsOrdered) {
				const taskTitle = taskTitleById.get(taskId);
				lines.push("");
				lines.push(`### Task ${taskId}${taskTitle ? ` — ${taskTitle}` : ""}`);

				const mentions = unreadMentionsByTask.get(taskId) ?? [];
				for (const mention of mentions) {
					lines.push("");
					lines.push(`#### Message ${mention.messageId}`);
					lines.push(`- From: ${mention.authorAgentId}`);
					lines.push(`- At: ${mention.createdAt}`);
					lines.push(`- Mentions: ${mention.mentionsAgentIds.join(", ")}`);
					lines.push("");
					lines.push(mention.content.trim());
				}
			}
		}

		lines.push("");
		lines.push(`## Working (recent events: ${workingEvents.length})`);
		if (workingEvents.length === 0) {
			lines.push("_No working events yet._");
		} else {
			const recent = workingEvents.slice(-8).reverse();
			for (const event of recent) {
				lines.push("");
				lines.push(`- ${event.createdAt}`);
				lines.push("");
				lines.push(event.content.trim());
			}
		}
		lines.push("");
		lines.push("## Memory");
		lines.push(memory.trim() || "_No memory yet._");
		lines.push("");
		lines.push("## Next Actions");
		lines.push(
			`1. Reply: \`clawion message add --mission ${missionId} --task <taskId> --content "..." --mentions <agentId,...> --agent ${agentId}\``,
		);
		lines.push(
			`2. Log progress: \`clawion working add --mission ${missionId} --content "..." --agent ${agentId}\``,
		);
		lines.push(
			`3. Update summary: \`clawion memory set --mission ${missionId} --content "..." --agent ${agentId}\``,
		);
		lines.push("");
		lines.push("_Unread mentions above have been automatically acknowledged._");

		console.log(lines.join("\n"));

		await Promise.all(
			unreadMentions.map((mention) =>
				appendInboxAck({
					missionsDir,
					missionId,
					agentId,
					messageId: mention.messageId,
					taskId: mention.taskId,
				}),
			),
		);
	} catch (error) {
		console.error(error instanceof Error ? error.message : String(error));
		process.exitCode = 1;
	}
}
