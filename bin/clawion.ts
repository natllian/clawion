#!/usr/bin/env tsx
import { spawn } from "node:child_process";
import { Command } from "commander";
import {
	resolveStatusForColumn,
	type TaskStatus,
} from "../src/core/task-status";
import {
	addAgent,
	listAgents,
	readWorkingFile,
	updateAgent,
} from "../src/core/workspace/agents";
import { ensureWorkspace } from "../src/core/workspace/init";
import { addLogEvent, getLog } from "../src/core/workspace/logs";
import { resolveMissionPath } from "../src/core/workspace/mission";
import {
	completeMission,
	createMission,
	showMission,
	updateMission,
} from "../src/core/workspace/missions";
import { resolveMissionsDir } from "../src/core/workspace/paths";
import { assertManager } from "../src/core/workspace/permissions";
import {
	assignTask,
	createTask,
	listTasks,
	updateTask,
} from "../src/core/workspace/tasks";
import {
	addThreadMessage,
	listThreads,
	resolveThreadMessage,
	unresolveThreadMessage,
} from "../src/core/workspace/threads";

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
	.option("--missions-dir <path>", "Override missions directory")
	.option("--agent <agentId>", "Agent ID for scoped actions")
	.showHelpAfterError();

program.hook("preAction", async (_thisCommand, actionCommand) => {
	const options = actionCommand.optsWithGlobals() as {
		missionsDir?: string;
	};
	const missionsDir = resolveMissionsDir(options.missionsDir);
	context.missionsDir = missionsDir;
	await ensureWorkspace({ missionsDir });
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
		params: ["--id <id>", "--name <name>", "--description <text>"],
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
		command: "mission update",
		purpose: "Update a mission description (manager only).",
		params: ["--id <id>", "--description <text>", "--agent <agentId>"],
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
			"--description <text>",
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
			"--role-description <text>",
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
			"--role-description <text> (optional)",
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
		purpose: "Show the acting agent profile, working notes, and logs.",
		params: ["--mission <id>", "--agent <agentId>"],
		example: "clawion agent whoami --mission m1 --agent agent-1",
	},
	{
		command: "thread add",
		purpose: "Append a message to a task thread.",
		params: [
			"--mission <id>",
			"--task <taskId>",
			"--title <text>",
			"--content <text>",
			"--mentions <agentId>",
			"--agent <agentId>",
		],
		example:
			"clawion thread add --mission m1 --task t1 --title 'API Review' --content 'Please review' --mentions agent-1 --agent manager-1",
	},
	{
		command: "thread resolve",
		purpose: "Resolve a thread message.",
		params: [
			"--mission <id>",
			"--task <taskId>",
			"--message <messageId>",
			"--agent <agentId>",
		],
		example:
			"clawion thread resolve --mission m1 --task t1 --message msg1 --agent agent-1",
	},
	{
		command: "thread unresolve",
		purpose: "Reopen a thread message.",
		params: [
			"--mission <id>",
			"--task <taskId>",
			"--message <messageId>",
			"--agent <agentId>",
		],
		example:
			"clawion thread unresolve --mission m1 --task t1 --message msg1 --agent agent-1",
	},
	{
		command: "thread inbox",
		purpose: "List unresolved mentions for the acting agent.",
		params: ["--mission <id>", "--agent <agentId>"],
		example: "clawion thread inbox --mission m1 --agent agent-1",
	},
	{
		command: "log add",
		purpose: "Append a log event for the acting agent.",
		params: [
			"--mission <id>",
			"--agent <agentId>",
			"--level <info|warn|error>",
			"--type <type>",
			"--message <text>",
			"--task <taskId> (optional)",
			"--thread <threadId> (optional)",
		],
		example:
			"clawion log add --mission m1 --agent agent-1 --level info --type task:update --message 'Updated task'",
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
	.requiredOption("--description <text>", "Mission description")
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
	.command("update")
	.description("Update a mission description (manager only)")
	.requiredOption("--id <id>", "Mission ID")
	.requiredOption("--description <text>", "New description")
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
	.requiredOption("--description <text>", "Task description")
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
	.requiredOption("--role-description <text>", "Role description for the agent")
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
	.option("--role-description <text>", "Role description")
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

			const working = await readWorkingFile(missionPath, actingAgentId);
			const log = await getLog(
				context.missionsDir,
				options.mission,
				actingAgentId,
			);

			console.log(
				JSON.stringify(
					{
						agent: agentEntry,
						working,
						log,
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

const thread = program.command("thread").description("Thread management");

thread
	.command("add")
	.description("Append a message to a task thread")
	.requiredOption("--mission <id>", "Mission ID")
	.requiredOption("--task <taskId>", "Task ID")
	.requiredOption("--title <text>", "Thread title")
	.requiredOption("--content <text>", "Message content")
	.requiredOption("--mentions <agentId>", "Mentioned agent ID")
	.action(async (options, command) => {
		const authorAgentId = requireAgentId(command);
		if (!authorAgentId) {
			return;
		}

		try {
			const messageId = await addThreadMessage({
				missionsDir: context.missionsDir,
				missionId: options.mission,
				taskId: options.task,
				title: options.title,
				authorAgentId,
				mentionsAgentId: options.mentions,
				content: options.content,
			});
			console.log(`Thread message added: ${messageId}`);
		} catch (error) {
			console.error(error instanceof Error ? error.message : String(error));
			process.exitCode = 1;
		}
	});

thread
	.command("resolve")
	.description("Resolve a thread message")
	.requiredOption("--mission <id>", "Mission ID")
	.requiredOption("--task <taskId>", "Task ID")
	.requiredOption("--message <messageId>", "Message ID")
	.action(async (options, command) => {
		const resolverAgentId = requireAgentId(command);
		if (!resolverAgentId) {
			return;
		}

		try {
			await resolveThreadMessage(
				context.missionsDir,
				options.mission,
				options.task,
				options.message,
				resolverAgentId,
			);
			console.log(`Thread message resolved: ${options.message}`);
		} catch (error) {
			console.error(error instanceof Error ? error.message : String(error));
			process.exitCode = 1;
		}
	});

thread
	.command("unresolve")
	.description("Reopen a thread message")
	.requiredOption("--mission <id>", "Mission ID")
	.requiredOption("--task <taskId>", "Task ID")
	.requiredOption("--message <messageId>", "Message ID")
	.action(async (options, command) => {
		const reopenedByAgentId = requireAgentId(command);
		if (!reopenedByAgentId) {
			return;
		}

		try {
			await unresolveThreadMessage(
				context.missionsDir,
				options.mission,
				options.task,
				options.message,
				reopenedByAgentId,
			);
			console.log(`Thread message unresolved: ${options.message}`);
		} catch (error) {
			console.error(error instanceof Error ? error.message : String(error));
			process.exitCode = 1;
		}
	});

thread
	.command("inbox")
	.description("List unresolved mentions for an agent")
	.requiredOption("--mission <id>", "Mission ID")
	.action(async (options, command) => {
		const agentId = requireAgentId(command);
		if (!agentId) {
			return;
		}

		try {
			const threads = await listThreads(context.missionsDir, options.mission);
			const inbox = threads.flatMap((threadItem) => {
				return threadItem.messages
					.filter(
						(message) =>
							!message.resolved && message.mentionsAgentId === agentId,
					)
					.map((message) => ({
						taskId: threadItem.taskId,
						threadTitle: threadItem.title,
						messageId: message.id,
						authorAgentId: message.authorAgentId,
						mentionsAgentId: message.mentionsAgentId,
						content: message.content,
						createdAt: message.createdAt,
					}));
			});

			console.log(JSON.stringify(inbox, null, 2));
		} catch (error) {
			console.error(error instanceof Error ? error.message : String(error));
			process.exitCode = 1;
		}
	});

thread.action(() => {
	thread.help();
});

const log = program.command("log").description("Log management");

log
	.command("add")
	.description("Append a log event")
	.requiredOption("--mission <id>", "Mission ID")
	.requiredOption("--level <level>", "Level (info|warn|error)")
	.requiredOption("--type <type>", "Event type")
	.requiredOption("--message <text>", "Message")
	.option("--task <taskId>", "Task ID")
	.option("--thread <threadId>", "Thread message ID")
	.action(async (options, command) => {
		const agentId = requireAgentId(command);
		if (!agentId) {
			return;
		}

		const level = options.level as "info" | "warn" | "error";
		if (!["info", "warn", "error"].includes(level)) {
			console.error("level must be info, warn, or error.");
			process.exitCode = 1;
			return;
		}
		try {
			const eventId = await addLogEvent({
				missionsDir: context.missionsDir,
				missionId: options.mission,
				agentId,
				level,
				type: options.type,
				message: options.message,
				taskId: options.task,
				threadId: options.thread,
			});
			console.log(`Log event added: ${eventId}`);
		} catch (error) {
			console.error(error instanceof Error ? error.message : String(error));
			process.exitCode = 1;
		}
	});

log.action(() => {
	log.help();
});

await program.parseAsync(process.argv);

if (!context.missionsDir) {
	const options = program.opts() as { missionsDir?: string };
	const missionsDir = resolveMissionsDir(options.missionsDir);
	context.missionsDir = missionsDir;
	await ensureWorkspace({ missionsDir });
}
