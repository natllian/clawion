#!/usr/bin/env tsx
import { spawn } from "node:child_process";
import { join } from "node:path";
import { Command } from "commander";
import { readJsonLines } from "../src/core/fs/jsonl";
import { pathExists } from "../src/core/fs/util";
import { threadMessageEventSchema } from "../src/core/schemas";
import {
	resolveStatusForColumn,
	type TaskStatus,
} from "../src/core/task-status";
import {
	addAgent,
	listAgents,
	updateAgent,
} from "../src/core/workspace/agents";
import { appendCliInvocation } from "../src/core/workspace/cli-invocations";
import { appendInboxAck, listInboxAcks } from "../src/core/workspace/inbox";
import { ensureWorkspace } from "../src/core/workspace/init";
import { readMemory, setMemory } from "../src/core/workspace/memory";
import { resolveMissionPath } from "../src/core/workspace/mission";
import {
	completeMission,
	createMission,
	showMission,
	updateMission,
	updateMissionRoadmap,
} from "../src/core/workspace/missions";
import { resolveMissionsDir } from "../src/core/workspace/paths";
import { assertManager } from "../src/core/workspace/permissions";
import {
	assignTask,
	createTask,
	listTasks,
	updateTask,
} from "../src/core/workspace/tasks";
import { addThreadMessage } from "../src/core/workspace/threads";
import {
	appendWorkingEvent,
	listWorkingEvents,
} from "../src/core/workspace/working";

type CliContext = {
	missionsDir: string;
};

const context: CliContext = {
	missionsDir: "",
};

const program = new Command();

program
	.name("clawion")
	.description("Clawion CLI")
	.option("--agent <agentId>", "Agent ID for scoped actions")
	.showHelpAfterError();

program.hook("preAction", async (_thisCommand, _actionCommand) => {
	const missionsDir = resolveMissionsDir();
	context.missionsDir = missionsDir;
	await ensureWorkspace({ missionsDir });
	const command = `clawion ${process.argv.slice(2).join(" ")}`;
	await appendCliInvocation(missionsDir, command);
});

program
	.command("ui")
	.description("Start the web UI dev server")
	.action(() => {
		const child = spawn("pnpm", ["dev"], {
			stdio: "inherit",
		});

		child.on("exit", (code) => {
			process.exit(code ?? 0);
		});
	});

type HelpEntry = {
	command: string;
	purpose: string;
	params: string[];
	example?: string;
};

const HELP_ENTRIES: HelpEntry[] = [
	{
		command: "ui",
		purpose: "Start the web UI dev server.",
		params: ["(no params)"],
		example: "clawion ui",
	},
	{
		command: "mission create",
		purpose: "Create a new mission from the template.",
		params: ["--id <id>", "--name <name>", "--description <markdown>"],
		example:
			"clawion mission create --id m1 --name 'Alpha' --description 'Build MVP'",
	},
	{
		command: "mission show",
		purpose: "Show mission metadata and roadmap.",
		params: ["--id <id>"],
		example: "clawion mission show --id m1",
	},
	{
		command: "mission roadmap",
		purpose:
			"Show the mission roadmap, or replace it (manager only for updates).",
		params: [
			"--id <id>",
			"--set <markdown> (optional)",
			"--agent <agentId> (required for updates)",
		],
		example:
			"clawion mission roadmap --id m1 --set '# Roadmap\\n\\n- Item' --agent manager-1",
	},
	{
		command: "mission update",
		purpose: "Update a mission description (manager only).",
		params: ["--id <id>", "--description <markdown>", "--agent <agentId>"],
		example:
			"clawion mission update --id m1 --description 'New scope' --agent manager-1",
	},
	{
		command: "mission complete",
		purpose: "Mark a mission completed (manager only).",
		params: ["--id <id>", "--agent <agentId>"],
		example: "clawion mission complete --id m1 --agent manager-1",
	},
	{
		command: "task create",
		purpose: "Create a task in a mission (manager only).",
		params: [
			"--mission <id>",
			"--id <taskId>",
			"--title <title>",
			"--description <markdown>",
			"--agent <agentId>",
		],
		example:
			"clawion task create --mission m1 --id t1 --title 'Spec' --description 'Write spec' --agent manager-1",
	},
	{
		command: "task list",
		purpose: "List tasks for a mission.",
		params: ["--mission <id>"],
		example: "clawion task list --mission m1",
	},
	{
		command: "task update",
		purpose: "Update task status or notes (assignee or manager).",
		params: [
			"--mission <id>",
			"--id <taskId>",
			"--agent <agentId>",
			"--status <pending|ongoing|blocked|completed> (optional)",
			"--status-notes <text> (optional)",
		],
		example:
			"clawion task update --mission m1 --id t1 --status blocked --status-notes 'Blocked: waiting on keys' --agent agent-1",
	},
	{
		command: "task assign",
		purpose: "Assign a task to an agent (manager only).",
		params: [
			"--mission <id>",
			"--task <taskId>",
			"--to <agentId>",
			"--agent <agentId>",
		],
		example:
			"clawion task assign --mission m1 --task t1 --to agent-1 --agent manager-1",
	},
	{
		command: "task mine",
		purpose: "List tasks assigned to the acting agent.",
		params: ["--mission <id>", "--agent <agentId>"],
		example: "clawion task mine --mission m1 --agent agent-1",
	},
	{
		command: "agent add",
		purpose: "Register an agent for a mission (manager only).",
		params: [
			"--mission <id>",
			"--id <agentId>",
			"--name <displayName>",
			"--system-role <manager|worker>",
			"--role-description <markdown>",
			"--status <active|paused> (optional)",
			"--agent <agentId>",
		],
		example:
			"clawion agent add --mission m1 --id manager-1 --name Manager --system-role manager --agent manager-1",
	},
	{
		command: "agent update",
		purpose: "Update an agent profile (manager only).",
		params: [
			"--mission <id>",
			"--id <agentId>",
			"--name <displayName> (optional)",
			"--role-description <markdown> (optional)",
			"--status <active|paused> (optional)",
			"--agent <agentId>",
		],
		example:
			"clawion agent update --mission m1 --id agent-1 --status paused --agent manager-1",
	},
	{
		command: "agent list",
		purpose: "List agents for a mission.",
		params: ["--mission <id>"],
		example: "clawion agent list --mission m1",
	},
	{
		command: "agent whoami",
		purpose: "Show the acting agent profile, working events, and memory.",
		params: ["--mission <id>", "--agent <agentId>"],
		example: "clawion agent whoami --mission m1 --agent agent-1",
	},
	{
		command: "agent wake",
		purpose: "Generate the agent prompt and acknowledge unread mentions.",
		params: ["--mission <id>", "--agent <agentId>"],
		example: "clawion agent wake --mission m1 --agent agent-1",
	},
	{
		command: "message add",
		purpose: "Append a message to a task thread.",
		params: [
			"--mission <id>",
			"--task <taskId>",
			"--content <markdown>",
			"--mentions <agentId,...>",
			"--agent <agentId>",
		],
		example:
			"clawion message add --mission m1 --task t1 --content 'Please review' --mentions agent-1,agent-2 --agent manager-1",
	},
	{
		command: "working add",
		purpose: "Append a working event for the acting agent.",
		params: ["--mission <id>", "--content <markdown>", "--agent <agentId>"],
		example:
			"clawion working add --mission m1 --content 'Investigating API error' --agent agent-1",
	},
	{
		command: "memory set",
		purpose: "Replace the memory summary for the acting agent.",
		params: ["--mission <id>", "--content <markdown>", "--agent <agentId>"],
		example:
			"clawion memory set --mission m1 --content '# Summary\\n- ...' --agent agent-1",
	},
];

function renderHelp(topic?: string) {
	if (!topic) {
		const commands = HELP_ENTRIES.map((entry) => entry.command).join("\n");
		console.log("Clawion Help");
		console.log(`\nCommands:\n${commands}`);
		console.log("\nUse: clawion help <command> for details.");
		return;
	}

	const entry = HELP_ENTRIES.find((item) => item.command === topic);
	if (!entry) {
		console.log(`Unknown help topic: ${topic}`);
		return;
	}

	console.log(`Command: ${entry.command}`);
	console.log(`Purpose: ${entry.purpose}`);
	console.log("Parameters:");
	for (const param of entry.params) {
		console.log(`- ${param}`);
	}
	if (entry.example) {
		console.log(`Example: ${entry.example}`);
	}
}

program
	.command("help [topic...]")
	.description("Show detailed command help")
	.action((topics: string[] | undefined) => {
		const topic = topics && topics.length > 0 ? topics.join(" ") : undefined;
		renderHelp(topic);
	});

function resolveAgentId(command: Command): string | null {
	const options = command.optsWithGlobals() as { agent?: string };
	const agentId = options.agent?.trim();
	return agentId && agentId.length > 0 ? agentId : null;
}

function requireAgentId(command: Command): string | null {
	const agentId = resolveAgentId(command);
	if (!agentId) {
		console.error("Command requires --agent <id>.");
		process.exitCode = 1;
		return null;
	}
	return agentId;
}

async function requireManager(
	command: Command,
	missionId: string,
): Promise<boolean> {
	const agentId = requireAgentId(command);
	if (!agentId) {
		process.exitCode = 1;
		return false;
	}

	try {
		await assertManager({
			missionsDir: context.missionsDir,
			missionId,
			agentId,
		});
		return true;
	} catch (error) {
		console.error(error instanceof Error ? error.message : String(error));
		process.exitCode = 1;
		return false;
	}
}

const mission = program.command("mission").description("Mission management");

mission
	.command("create")
	.description("Create a mission from the template")
	.requiredOption("--id <id>", "Mission ID")
	.requiredOption("--name <name>", "Mission name")
	.requiredOption("--description <markdown>", "Mission description")
	.action(async (options) => {
		try {
			await createMission({
				missionsDir: context.missionsDir,
				id: options.id,
				name: options.name,
				description: options.description,
			});
			console.log(`Mission created: ${options.id}`);
		} catch (error) {
			console.error(error instanceof Error ? error.message : String(error));
			process.exitCode = 1;
		}
	});

mission
	.command("show")
	.description("Show mission metadata and roadmap")
	.requiredOption("--id <id>", "Mission ID")
	.action(async (options) => {
		try {
			const data = await showMission(context.missionsDir, options.id);
			console.log(JSON.stringify(data, null, 2));
		} catch (error) {
			console.error(error instanceof Error ? error.message : String(error));
			process.exitCode = 1;
		}
	});

mission
	.command("roadmap")
	.description("Show or update mission roadmap (manager only for updates)")
	.requiredOption("--id <id>", "Mission ID")
	.option("--set <markdown>", "Replace roadmap contents")
	.action(async (options, command) => {
		try {
			if (!options.set) {
				const data = await showMission(context.missionsDir, options.id);
				console.log(data.roadmap);
				return;
			}

			const allowed = await requireManager(command, options.id);
			if (!allowed) {
				return;
			}

			const roadmap = String(options.set);

			await updateMissionRoadmap({
				missionsDir: context.missionsDir,
				id: options.id,
				roadmap,
			});
			console.log(`Mission roadmap updated: ${options.id}`);
		} catch (error) {
			console.error(error instanceof Error ? error.message : String(error));
			process.exitCode = 1;
		}
	});

mission
	.command("update")
	.description("Update a mission description (manager only)")
	.requiredOption("--id <id>", "Mission ID")
	.requiredOption("--description <markdown>", "New description")
	.action(async (options, command) => {
		const allowed = await requireManager(command, options.id);
		if (!allowed) {
			return;
		}
		try {
			await updateMission({
				missionsDir: context.missionsDir,
				id: options.id,
				description: options.description,
			});
			console.log(`Mission updated: ${options.id}`);
		} catch (error) {
			console.error(error instanceof Error ? error.message : String(error));
			process.exitCode = 1;
		}
	});

mission
	.command("complete")
	.description("Mark a mission as completed (manager only)")
	.requiredOption("--id <id>", "Mission ID")
	.action(async (options, command) => {
		const allowed = await requireManager(command, options.id);
		if (!allowed) {
			return;
		}
		try {
			await completeMission(context.missionsDir, options.id);
			console.log(`Mission completed: ${options.id}`);
		} catch (error) {
			console.error(error instanceof Error ? error.message : String(error));
			process.exitCode = 1;
		}
	});

mission.action(() => {
	mission.help();
});

const task = program.command("task").description("Task management");

task
	.command("create")
	.description("Create a task (manager only)")
	.requiredOption("--mission <id>", "Mission ID")
	.requiredOption("--id <taskId>", "Task ID")
	.requiredOption("--title <title>", "Task title")
	.requiredOption("--description <markdown>", "Task description")
	.action(async (options, command) => {
		const allowed = await requireManager(command, options.mission);
		if (!allowed) {
			return;
		}
		try {
			await createTask({
				missionsDir: context.missionsDir,
				missionId: options.mission,
				id: options.id,
				title: options.title,
				description: options.description,
			});
			console.log(`Task created: ${options.id}`);
		} catch (error) {
			console.error(error instanceof Error ? error.message : String(error));
			process.exitCode = 1;
		}
	});

task
	.command("list")
	.description("List tasks")
	.requiredOption("--mission <id>", "Mission ID")
	.action(async (options) => {
		try {
			const tasksFile = await listTasks(context.missionsDir, options.mission);
			console.log(JSON.stringify(tasksFile, null, 2));
		} catch (error) {
			console.error(error instanceof Error ? error.message : String(error));
			process.exitCode = 1;
		}
	});

task
	.command("update")
	.description("Update task status or notes (assignee or manager)")
	.requiredOption("--mission <id>", "Mission ID")
	.requiredOption("--id <taskId>", "Task ID")
	.option("--status-notes <text>", "Status notes")
	.option("--status <status>", "Status (pending|ongoing|blocked|completed)")
	.action(async (options, command) => {
		const agentId = requireAgentId(command);
		if (!agentId) {
			return;
		}

		try {
			const tasksFile = await listTasks(context.missionsDir, options.mission);
			const taskItem = tasksFile.tasks.find((entry) => entry.id === options.id);
			if (!taskItem) {
				throw new Error(`Task not found: ${options.id}`);
			}

			let manager = false;
			try {
				await assertManager({
					missionsDir: context.missionsDir,
					missionId: options.mission,
					agentId,
				});
				manager = true;
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				if (message.toLowerCase().includes("not found")) {
					throw error;
				}
				manager = false;
			}

			if (!manager && taskItem.assigneeAgentId !== agentId) {
				throw new Error(
					`Permission denied. Only the assignee or a manager can update task ${options.id}.`,
				);
			}

			const rawStatus = (options.status as string | undefined)?.trim();
			const status = rawStatus ? (rawStatus as TaskStatus) : undefined;
			if (
				status &&
				!["pending", "ongoing", "blocked", "completed"].includes(status)
			) {
				throw new Error(
					"status must be pending, ongoing, blocked, or completed.",
				);
			}

			await updateTask({
				missionsDir: context.missionsDir,
				missionId: options.mission,
				id: options.id,
				statusNotes: options.statusNotes,
				status,
			});
			console.log(`Task updated: ${options.id}`);
		} catch (error) {
			console.error(error instanceof Error ? error.message : String(error));
			process.exitCode = 1;
		}
	});

task
	.command("assign")
	.description("Assign a task to an agent (manager only)")
	.requiredOption("--mission <id>", "Mission ID")
	.requiredOption("--task <taskId>", "Task ID")
	.requiredOption("--to <agentId>", "Assignee agent ID")
	.action(async (options, command) => {
		const allowed = await requireManager(command, options.mission);
		if (!allowed) {
			return;
		}
		try {
			await assignTask(
				context.missionsDir,
				options.mission,
				options.task,
				options.to,
			);
			console.log(`Task assigned: ${options.task}`);
		} catch (error) {
			console.error(error instanceof Error ? error.message : String(error));
			process.exitCode = 1;
		}
	});

task
	.command("mine")
	.description("List tasks assigned to the acting agent")
	.requiredOption("--mission <id>", "Mission ID")
	.action(async (options, command) => {
		const agentId = requireAgentId(command);
		if (!agentId) {
			return;
		}

		try {
			const tasksFile = await listTasks(context.missionsDir, options.mission);
			const mine = tasksFile.tasks
				.filter((taskItem) => taskItem.assigneeAgentId === agentId)
				.map((taskItem) => ({
					id: taskItem.id,
					title: taskItem.title,
					description: taskItem.description,
					status: resolveStatusForColumn(tasksFile.columns, taskItem.columnId),
					statusNotes: taskItem.statusNotes,
					columnId: taskItem.columnId,
					assigneeAgentId: taskItem.assigneeAgentId ?? null,
					createdAt: taskItem.createdAt,
					updatedAt: taskItem.updatedAt,
				}))
				.filter((entry) => entry.status !== "completed");

			console.log(JSON.stringify(mine, null, 2));
		} catch (error) {
			console.error(error instanceof Error ? error.message : String(error));
			process.exitCode = 1;
		}
	});

task.action(() => {
	task.help();
});

const agent = program.command("agent").description("Agent management");

agent
	.command("add")
	.description("Register an agent for a mission (manager only)")
	.requiredOption("--mission <id>", "Mission ID")
	.requiredOption("--id <agentId>", "Agent ID")
	.requiredOption("--name <displayName>", "Display name")
	.requiredOption("--system-role <role>", "System role (manager|worker)")
	.requiredOption(
		"--role-description <markdown>",
		"Role description for the agent",
	)
	.option("--status <status>", "Status (active|paused)", "active")
	.action(async (options, command) => {
		const actingAgentId = requireAgentId(command);
		if (!actingAgentId) {
			return;
		}

		const missionPath = await resolveMissionPath(
			context.missionsDir,
			options.mission,
		);

		const systemRole = options.systemRole as "manager" | "worker";
		if (systemRole !== "manager" && systemRole !== "worker") {
			console.error("system-role must be manager or worker.");
			process.exitCode = 1;
			return;
		}

		const status = options.status as "active" | "paused";
		if (status !== "active" && status !== "paused") {
			console.error("status must be active or paused.");
			process.exitCode = 1;
			return;
		}

		try {
			const agentsFile = await listAgents(missionPath);
			const bootstrapping =
				agentsFile.agents.length === 0 &&
				systemRole === "manager" &&
				options.id === actingAgentId;
			if (!bootstrapping) {
				const allowed = await requireManager(command, options.mission);
				if (!allowed) {
					return;
				}
			}

			await addAgent(missionPath, {
				id: options.id,
				displayName: options.name,
				roleDescription: options.roleDescription,
				systemRole,
				status,
			});
			console.log(`Agent registered: ${options.id}`);
		} catch (error) {
			console.error(error instanceof Error ? error.message : String(error));
			process.exitCode = 1;
		}
	});

agent
	.command("update")
	.description("Update an agent profile (manager only)")
	.requiredOption("--mission <id>", "Mission ID")
	.requiredOption("--id <agentId>", "Agent ID")
	.option("--name <displayName>", "Display name")
	.option("--role-description <markdown>", "Role description")
	.option("--status <status>", "Status (active|paused)")
	.action(async (options, command) => {
		const allowed = await requireManager(command, options.mission);
		if (!allowed) {
			return;
		}

		try {
			const missionPath = await resolveMissionPath(
				context.missionsDir,
				options.mission,
			);
			await updateAgent(missionPath, options.id, {
				displayName: options.name,
				roleDescription: options.roleDescription,
				status: options.status,
			});
			console.log(`Agent updated: ${options.id}`);
		} catch (error) {
			console.error(error instanceof Error ? error.message : String(error));
			process.exitCode = 1;
		}
	});

agent
	.command("list")
	.description("List agents")
	.requiredOption("--mission <id>", "Mission ID")
	.action(async (options) => {
		try {
			const missionPath = await resolveMissionPath(
				context.missionsDir,
				options.mission,
			);
			const agentsFile = await listAgents(missionPath);
			console.log(JSON.stringify(agentsFile, null, 2));
		} catch (error) {
			console.error(error instanceof Error ? error.message : String(error));
			process.exitCode = 1;
		}
	});

agent
	.command("whoami")
	.description("Show details for the acting agent")
	.requiredOption("--mission <id>", "Mission ID")
	.action(async (options, command) => {
		const actingAgentId = requireAgentId(command);
		if (!actingAgentId) {
			return;
		}

		try {
			const missionPath = await resolveMissionPath(
				context.missionsDir,
				options.mission,
			);
			const agentsFile = await listAgents(missionPath);
			const agentEntry = agentsFile.agents.find(
				(entry) => entry.id === actingAgentId,
			);
			if (!agentEntry) {
				console.error(`Agent not found: ${actingAgentId}`);
				process.exitCode = 1;
				return;
			}

			const [working, memory] = await Promise.all([
				listWorkingEvents(context.missionsDir, options.mission, actingAgentId),
				readMemory(context.missionsDir, options.mission, actingAgentId),
			]);

			console.log(
				JSON.stringify(
					{
						agent: agentEntry,
						working,
						memory,
					},
					null,
					2,
				),
			);
		} catch (error) {
			console.error(error instanceof Error ? error.message : String(error));
			process.exitCode = 1;
		}
	});

agent.action(() => {
	agent.help();
});

agent
	.command("wake")
	.description("Generate the agent prompt and acknowledge unread mentions")
	.requiredOption("--mission <id>", "Mission ID")
	.action(async (options, command) => {
		const agentId = requireAgentId(command);
		if (!agentId) {
			return;
		}

		try {
			const missionPath = await resolveMissionPath(
				context.missionsDir,
				options.mission,
			);
			const agentsFile = await listAgents(missionPath);
			const agentEntry = agentsFile.agents.find(
				(entry) => entry.id === agentId,
			);
			if (!agentEntry) {
				console.error(`Agent not found: ${agentId}`);
				process.exitCode = 1;
				return;
			}

			const [missionPayload, tasksFile, workingEvents, memory, inboxAcks] =
				await Promise.all([
					showMission(context.missionsDir, options.mission),
					listTasks(context.missionsDir, options.mission),
					listWorkingEvents(context.missionsDir, options.mission, agentId),
					readMemory(context.missionsDir, options.mission, agentId),
					listInboxAcks(context.missionsDir, options.mission, agentId),
				]);

			const ackedMessageIds = new Set(
				inboxAcks.map((entry) => entry.messageId),
			);

			const threadsDir = join(missionPath, "threads");
			const unreadMentions: Array<{
				taskId: string;
				messageId: string;
				authorAgentId: string;
				mentionsAgentIds: string[];
				content: string;
				createdAt: string;
			}> = [];

			if (await pathExists(threadsDir)) {
				const { readdir } = await import("node:fs/promises");
				const files = await readdir(threadsDir);
				const threadFiles = files.filter((file) => file.endsWith(".jsonl"));

				for (const file of threadFiles) {
					const taskId = file.replace(/\\.jsonl$/, "");
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

			const lines: string[] = [];

			lines.push(`# Wake: ${agentEntry.displayName}`);
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
			lines.push("## Unread Mentions");
			if (unreadMentions.length === 0) {
				lines.push("_No unread mentions._");
			} else {
				for (const mention of unreadMentions) {
					lines.push(
						`### Task ${mention.taskId} · Message ${mention.messageId}`,
					);
					lines.push(`- From: ${mention.authorAgentId}`);
					lines.push(`- Mentions: ${mention.mentionsAgentIds.join(", ")}`);
					lines.push(`- At: ${mention.createdAt}`);
					lines.push("");
					lines.push(mention.content);
					lines.push("");
				}
			}
			lines.push("");
			lines.push("## Working Summary");
			if (workingEvents.length === 0) {
				lines.push("_No working events yet._");
			} else {
				const recent = workingEvents.slice(-8);
				for (const event of recent) {
					lines.push(`- ${event.createdAt} · ${event.content}`);
				}
			}
			lines.push("");
			lines.push("## Memory");
			lines.push(memory.trim() || "_No memory yet._");
			lines.push("");
			lines.push("## Next Actions");
			lines.push(
				`1. Reply: \`clawion message add --mission ${options.mission} --task <taskId> --content "..." --mentions <agentId,...> --agent ${agentId}\``,
			);
			lines.push(
				`2. Log progress: \`clawion working add --mission ${options.mission} --content "..." --agent ${agentId}\``,
			);
			lines.push(
				`3. Update summary: \`clawion memory set --mission ${options.mission} --content "..." --agent ${agentId}\``,
			);
			lines.push("");
			lines.push(
				"_Unread mentions above have been automatically acknowledged._",
			);

			console.log(lines.join("\n"));

			await Promise.all(
				unreadMentions.map((mention) =>
					appendInboxAck({
						missionsDir: context.missionsDir,
						missionId: options.mission,
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
	});

const message = program.command("message").description("Thread messaging");

message
	.command("add")
	.description("Append a message to a task thread")
	.requiredOption("--mission <id>", "Mission ID")
	.requiredOption("--task <taskId>", "Task ID")
	.requiredOption("--content <markdown>", "Message content")
	.requiredOption(
		"--mentions <agentIds>",
		"Mentioned agent IDs (comma-separated)",
	)
	.action(async (options, command) => {
		const authorAgentId = requireAgentId(command);
		if (!authorAgentId) {
			return;
		}

		const mentionsRaw =
			typeof options.mentions === "string" ? options.mentions : "";
		const mentions = Array.from(
			new Set<string>(
				mentionsRaw
					.split(",")
					.map((value: string) => value.trim())
					.filter((value: string) => value.length > 0),
			),
		);

		if (mentions.length === 0) {
			console.error("Error: --mentions must include at least one agent ID.");
			process.exitCode = 1;
			return;
		}

		try {
			const missionPath = await resolveMissionPath(
				context.missionsDir,
				options.mission,
			);
			const agentsFile = await listAgents(missionPath);
			const activeAgents = agentsFile.agents.filter(
				(entry) => entry.status === "active",
			);
			const activeAgentIds = new Set(activeAgents.map((entry) => entry.id));
			const invalidMentions = mentions.filter(
				(entry) => !activeAgentIds.has(entry),
			);

			if (invalidMentions.length > 0) {
				console.error(
					`Error: Invalid mentions: ${invalidMentions.join(
						", ",
					)}. Active agents: ${activeAgents
						.map((entry) => entry.id)
						.join(", ")}`,
				);
				process.exitCode = 1;
				return;
			}

			const messageId = await addThreadMessage({
				missionsDir: context.missionsDir,
				missionId: options.mission,
				taskId: options.task,
				authorAgentId,
				mentionsAgentIds: mentions,
				content: options.content,
			});
			console.log(`Message added: ${messageId}`);
		} catch (error) {
			console.error(error instanceof Error ? error.message : String(error));
			process.exitCode = 1;
		}
	});

message.action(() => {
	message.help();
});

const working = program.command("working").description("Working events");

working
	.command("add")
	.description("Append a working event")
	.requiredOption("--mission <id>", "Mission ID")
	.requiredOption("--content <markdown>", "Working content")
	.action(async (options, command) => {
		const agentId = requireAgentId(command);
		if (!agentId) {
			return;
		}

		try {
			const entry = await appendWorkingEvent({
				missionsDir: context.missionsDir,
				missionId: options.mission,
				agentId,
				content: options.content,
			});
			console.log(`Working event added: ${entry.id}`);
		} catch (error) {
			console.error(error instanceof Error ? error.message : String(error));
			process.exitCode = 1;
		}
	});

working.action(() => {
	working.help();
});

const memory = program.command("memory").description("Memory management");

memory
	.command("set")
	.description("Replace the memory summary")
	.requiredOption("--mission <id>", "Mission ID")
	.requiredOption("--content <markdown>", "Memory content")
	.action(async (options, command) => {
		const agentId = requireAgentId(command);
		if (!agentId) {
			return;
		}

		try {
			await setMemory({
				missionsDir: context.missionsDir,
				missionId: options.mission,
				agentId,
				content: options.content,
			});
			console.log(`Memory updated: ${agentId}`);
		} catch (error) {
			console.error(error instanceof Error ? error.message : String(error));
			process.exitCode = 1;
		}
	});

memory.action(() => {
	memory.help();
});

await program.parseAsync(process.argv);

if (!context.missionsDir) {
	const options = program.opts() as { missionsDir?: string };
	const missionsDir = resolveMissionsDir(options.missionsDir);
	context.missionsDir = missionsDir;
	await ensureWorkspace({ missionsDir });
}
