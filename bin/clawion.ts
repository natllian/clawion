#!/usr/bin/env node
import { Command } from "commander";
import { runInit } from "../src/cli/init";
import { logInvocations } from "../src/cli/log";
import { runThreadShow } from "../src/cli/thread-show";
import { startUiServer } from "../src/cli/ui-server";
import { runWake } from "../src/cli/wake";
import {
	resolveStatusForColumn,
	type TaskStatus,
} from "../src/core/task-status";
import { addAgent, listAgents } from "../src/core/workspace/agents";
import {
	appendCliInvocation,
	resolveCliInvocationsPath,
} from "../src/core/workspace/cli-invocations";
import { ensureWorkspace } from "../src/core/workspace/init";
import { resolveMissionPath } from "../src/core/workspace/mission";
import {
	completeMission,
	createMission,
	showMission,
	updateMissionRoadmap,
} from "../src/core/workspace/missions";
import {
	resolveMissionsDir,
	resolveWorkspaceDir,
} from "../src/core/workspace/paths";
import { assertManager } from "../src/core/workspace/permissions";
import {
	assignTask,
	createTask,
	listTasks,
	updateTask,
} from "../src/core/workspace/tasks";
import { addThreadMessage } from "../src/core/workspace/threads";
import { appendWorkingEvent } from "../src/core/workspace/working";

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
	const workspaceDir = resolveWorkspaceDir();
	const command = `clawion ${process.argv.slice(2).join(" ")}`;
	await appendCliInvocation(workspaceDir, command);
});

program
	.command("init")
	.description("Install built-in clawion skill into OpenClaw workspace")
	.action(async () => {
		try {
			const result = await runInit({ cliModuleUrl: import.meta.url });
			console.log(`OpenClaw config: ${result.configPath}`);
			console.log(`OpenClaw workspace: ${result.workspaceDir}`);
			console.log(`Skill installed: ${result.targetPath}`);
		} catch (error) {
			console.error(error instanceof Error ? error.message : String(error));
			process.exitCode = 1;
		}
	});

program
	.command("ui")
	.description("Start the web UI server")
	.option("--port <port>", "Port for the web UI server")
	.action((options) => {
		const result = startUiServer({
			port: options.port as string | undefined,
			cliModuleUrl: import.meta.url,
		});
		if (!result.child) {
			console.error(result.errorMessage ?? "Failed to start web UI server.");
			process.exitCode = 1;
			return;
		}
		const child = result.child;

		child.on("exit", (code) => {
			process.exit(code ?? 0);
		});

		child.on("error", (error) => {
			console.error(
				error instanceof Error
					? error.message
					: "Failed to start web UI server.",
			);
			process.exitCode = 1;
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
		command: "init",
		purpose:
			"Install built-in clawion SKILL.md into OpenClaw workspace from openclaw.json.",
		params: ["(no params)"],
		example: "clawion init",
	},
	{
		command: "ui",
		purpose: "Start the packaged web UI server.",
		params: ["--port <port> (optional)"],
		example: "clawion ui --port 3000",
	},
	{
		command: "log",
		purpose: "Show CLI invocation logs (tail -f).",
		params: ["(no params)"],
		example: "clawion log",
	},
	{
		command: "mission create",
		purpose: "Create a new mission from the template.",
		params: ["--id <id>", "--name <name>"],
		example: "clawion mission create --id m1 --name 'Alpha'",
	},
	{
		command: "mission roadmap",
		purpose: "Set the mission roadmap (manager only, write-once).",
		params: ["--id <id>", "--set <markdown>", "--agent <agentId>"],
		example:
			"clawion mission roadmap --id m1 --set '# Roadmap\\n\\n- Item' --agent manager-1",
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
		command: "task update",
		purpose: "Update task status or notes (manager only).",
		params: [
			"--mission <id>",
			"--id <taskId>",
			"--agent <agentId>",
			"--status <pending|ongoing|blocked|completed> (optional)",
			"--status-notes <text> (optional)",
		],
		example:
			"clawion task update --mission m1 --id t1 --status blocked --status-notes 'Blocked: waiting on keys' --agent manager-1",
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
		command: "agent add",
		purpose: "Register an agent for a mission (manager only).",
		params: [
			"--mission <id>",
			"--id <agentId>",
			"--name <displayName>",
			"--system-role <manager|worker>",
			"--role-description <markdown>",
			"--agent <agentId>",
		],
		example:
			"clawion agent add --mission m1 --id manager-1 --name Manager --system-role manager --agent manager-1",
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
		command: "thread show",
		purpose: "Show thread messages for a task (manager only).",
		params: ["--mission <id>", "--task <taskId>", "--agent <agentId>"],
		example: "clawion thread show --mission m1 --task t1 --agent manager-1",
	},
	{
		command: "working add",
		purpose: "Append a working event for the acting agent.",
		params: ["--mission <id>", "--content <markdown>", "--agent <agentId>"],
		example:
			"clawion working add --mission m1 --content 'Investigating API error' --agent agent-1",
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

program
	.command("log")
	.description("Show CLI invocation logs")
	.action(async () => {
		const workspaceDir = resolveWorkspaceDir();
		const logPath = resolveCliInvocationsPath(workspaceDir);
		await logInvocations(logPath);
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
	.action(async (options) => {
		try {
			await createMission({
				missionsDir: context.missionsDir,
				id: options.id,
				name: options.name,
			});
			console.log(`Mission created: ${options.id}`);
		} catch (error) {
			console.error(error instanceof Error ? error.message : String(error));
			process.exitCode = 1;
		}
	});

mission
	.command("roadmap")
	.description("Set mission roadmap (manager only, write-once)")
	.requiredOption("--id <id>", "Mission ID")
	.option("--set <markdown>", "Replace roadmap contents")
	.action(async (options, command) => {
		try {
			if (!options.set) {
				console.error("read via wake");
				process.exitCode = 1;
				return;
			}

			const allowed = await requireManager(command, options.id);
			if (!allowed) {
				return;
			}

			const existing = await showMission(context.missionsDir, options.id);
			if (existing.roadmap.trim().length > 0) {
				console.error("Roadmap already exists.");
				process.exitCode = 1;
				return;
			}

			const roadmap = String(options.set);

			await updateMissionRoadmap({
				missionsDir: context.missionsDir,
				id: options.id,
				roadmap,
			});
			console.log(`Mission roadmap set: ${options.id}`);
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
			const tasksFile = await listTasks(context.missionsDir, options.id);
			const incomplete = tasksFile.tasks
				.map((task) => ({
					...task,
					status: resolveStatusForColumn(tasksFile.columns, task.columnId),
				}))
				.filter((task) => task.status !== "completed");

			if (incomplete.length > 0) {
				const details = incomplete.map(
					(task) =>
						`- ${task.id} (${task.title}) — ${task.status}${task.assigneeAgentId ? `, assigned to ${task.assigneeAgentId}` : ", unassigned"}${task.statusNotes?.trim() ? `: ${task.statusNotes.trim()}` : ""}`,
				);
				console.error(
					[
						`Cannot complete mission: ${incomplete.length} task(s) not completed.`,
						"",
						...details,
						"",
						"All tasks must be completed before the mission can be marked as completed.",
					].join("\n"),
				);
				process.exitCode = 1;
				return;
			}

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
	.command("update")
	.description("Update task status or notes (manager only)")
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
			await assertManager({
				missionsDir: context.missionsDir,
				missionId: options.mission,
				agentId,
			});
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			if (message.toLowerCase().includes("not found")) {
				console.error(message);
			} else {
				console.error("manager only");
			}
			process.exitCode = 1;
			return;
		}

		try {
			const tasksFile = await listTasks(context.missionsDir, options.mission);
			const taskItem = tasksFile.tasks.find((entry) => entry.id === options.id);
			if (!taskItem) {
				throw new Error(`Task not found: ${options.id}`);
			}

			const rawStatus = (options.status as string | undefined)?.trim();
			const validStatuses: TaskStatus[] = [
				"pending",
				"ongoing",
				"blocked",
				"completed",
			];
			let status: TaskStatus | undefined;
			if (rawStatus) {
				if (!validStatuses.includes(rawStatus as TaskStatus)) {
					throw new Error(
						"status must be pending, ongoing, blocked, or completed.",
					);
				}
				status = rawStatus as TaskStatus;
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
			});
			console.log(`Agent registered: ${options.id}`);
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

		await runWake({
			missionId: options.mission,
			agentId,
			missionsDir: context.missionsDir,
		});
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
		const rawMentions = mentionsRaw
			.split(",")
			.map((value: string) => value.trim())
			.filter((value: string) => value.length > 0);

		if (rawMentions.includes(authorAgentId)) {
			console.error(
				`Error: Cannot mention yourself (${authorAgentId}). Remove yourself from --mentions.`,
			);
			process.exitCode = 1;
			return;
		}

		const mentions = Array.from(new Set<string>(rawMentions));

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
			const agentIds = new Set(agentsFile.agents.map((entry) => entry.id));

			if (!agentIds.has(authorAgentId)) {
				console.error(
					`Error: Author agent not found: ${authorAgentId}. Register the agent first.`,
				);
				process.exitCode = 1;
				return;
			}

			const invalidMentions = mentions.filter((entry) => !agentIds.has(entry));

			if (invalidMentions.length > 0) {
				console.error(
					`Error: Invalid mentions: ${invalidMentions.join(", ")}. Check agents via wake.`,
				);
				process.exitCode = 1;
				return;
			}

			const tasksFile = await listTasks(context.missionsDir, options.mission);
			const validTaskIds = new Set(tasksFile.tasks.map((entry) => entry.id));
			if (!validTaskIds.has(options.task)) {
				console.error(
					`Error: Task not found: ${options.task}. Valid tasks: ${Array.from(validTaskIds).join(", ")}`,
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

const thread = program.command("thread").description("Thread operations");

thread
	.command("show")
	.description("Show thread messages for a task (manager only)")
	.requiredOption("--mission <id>", "Mission ID")
	.requiredOption("--task <taskId>", "Task ID")
	.action(async (options, command) => {
		const allowed = await requireManager(command, options.mission);
		if (!allowed) {
			return;
		}
		try {
			await runThreadShow({
				missionsDir: context.missionsDir,
				missionId: options.mission,
				taskId: options.task,
			});
		} catch (error) {
			console.error(error instanceof Error ? error.message : String(error));
			process.exitCode = 1;
		}
	});

thread.action(() => {
	thread.help();
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

await program.parseAsync(process.argv);
